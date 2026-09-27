<?php

namespace Tests\Feature;

use App\Mail\BookingConfirmedMail;
use App\Mail\NewBookingMail;
use App\Models\AvailabilityException;
use App\Models\Booking;
use App\Models\BookingServiceDetail;
use App\Models\CreatorAvailability;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\SlotService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class BookingPageTest extends TestCase
{
    use RefreshDatabase;

    /** Monday 5 Oct 2026 — creator ke hours 10:00–13:00 IST (= 04:30–07:30 UTC). */
    private const MONDAY = '2026-10-05';

    protected function setUp(): void
    {
        parent::setUp();
        // Monday subah 8:30 IST — pehla slot (10:00) MIN_NOTICE ke baad hai
        Carbon::setTestNow(Carbon::parse('2026-10-05 03:00:00', 'UTC'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function creator(string $start = '10:00', string $end = '13:00'): User
    {
        /** @var User $creator */
        $creator = User::factory()->createOne(['role' => 'creator', 'status' => 'active', 'username' => 'coach' . User::count()]);

        foreach (range(0, 6) as $d) {
            CreatorAvailability::create([
                'user_id' => $creator->id, 'timezone' => 'Asia/Kolkata', 'weekday' => $d,
                'is_enabled' => $d >= 1 && $d <= 5, 'start_time' => $start, 'end_time' => $end,
            ]);
        }

        return $creator;
    }

    private function bookingSession(User $creator, array $product = [], array $detail = []): BookingServiceDetail
    {
        $p = Product::create($product + [
            'creator_id' => $creator->id,
            'type' => 'booking',
            'title' => 'Intro call',
            'slug' => 'intro-call-' . Product::count(),
            'status' => 'published',
            'pricing_type' => 'free',
            'price' => 0,
        ]);

        return BookingServiceDetail::create($detail + ['product_id' => $p->id, 'duration_minutes' => 60, 'is_active' => true]);
    }

    private function labels(User $creator, BookingServiceDetail $service, string $date = self::MONDAY): array
    {
        return array_column(app(SlotService::class)->slots($creator->id, $service, $date), 'label');
    }

    private function book(User $creator, BookingServiceDetail $service, string $slotUtc, array $extra = [])
    {
        return $this->postJson("/book/{$creator->username}/{$service->product->slug}", $extra + [
            'name' => 'Rohan Kulkarni',
            'email' => 'rohan@test.com',
            'phone' => '9930412847',
            'slot' => $slotUtc,
        ]);
    }

    /* ---------------------------------------------------------------- slots */

    public function test_slots_follow_weekly_hours(): void
    {
        $creator = $this->creator();

        $this->assertSame(['10:00 am', '11:00 am', '12:00 pm'], $this->labels($creator, $this->bookingSession($creator)));
    }

    public function test_last_slot_must_end_inside_the_window(): void
    {
        $creator = $this->creator('10:00', '12:30');

        $this->assertSame(['10:00 am', '11:00 am'], $this->labels($creator, $this->bookingSession($creator)));
    }

    public function test_slots_too_close_to_now_are_hidden(): void
    {
        $creator = $this->creator();
        Carbon::setTestNow(Carbon::parse('2026-10-05 04:45:00', 'UTC')); // 10:15 IST — 11:15 se pehle kuch nahi

        $this->assertSame(['12:00 pm'], $this->labels($creator, $this->bookingSession($creator)));
    }

    public function test_closed_weekday_and_blocked_date_have_no_slots(): void
    {
        $creator = $this->creator();
        $service = $this->bookingSession($creator);

        $this->assertSame([], $this->labels($creator, $service, '2026-10-11')); // Sunday

        AvailabilityException::create(['user_id' => $creator->id, 'date' => '2026-10-06', 'is_blocked' => true, 'reason' => 'Holiday']);
        $this->assertSame([], $this->labels($creator, $service, '2026-10-06'));
    }

    public function test_booked_time_from_any_session_is_hidden_but_expired_holds_are_not(): void
    {
        $creator = $this->creator();
        $service = $this->bookingSession($creator);
        $other = $this->bookingSession($creator, ['title' => 'Quick review'], ['duration_minutes' => 30]);
        $customer = Customer::create(['creator_id' => $creator->id, 'name' => 'A', 'phone' => '9000000001']);

        // dusri session ki free booking 11:00–11:30 IST
        Booking::create([
            'booking_service_id' => $other->id, 'creator_id' => $creator->id, 'customer_id' => $customer->id,
            'scheduled_at' => '2026-10-05 05:30:00', 'duration_minutes' => 30, 'status' => 'upcoming',
        ]);

        // 12:00 IST pe 20 minute purana pending payment — hold expire ho chuka
        $order = Order::create([
            'order_number' => 'ORD-0001', 'creator_id' => $creator->id, 'customer_id' => $customer->id, 'product_id' => $service->product_id,
            'buyer_phone' => '9000000001', 'base_amount' => 0, 'total_amount' => 0, 'commission_rate' => 0,
            'platform_fee' => 0, 'net_payout_amount' => 0, 'status' => 'pending',
        ]);
        Order::whereKey($order->id)->update(['created_at' => now()->subMinutes(20)]);
        Booking::create([
            'booking_service_id' => $service->id, 'creator_id' => $creator->id, 'customer_id' => $customer->id, 'order_id' => $order->id,
            'scheduled_at' => '2026-10-05 06:30:00', 'duration_minutes' => 60, 'status' => 'upcoming',
        ]);

        $this->assertSame(['10:00 am', '12:00 pm'], $this->labels($creator, $service));
    }

    /* ---------------------------------------------------------------- booking */

    public function test_free_session_is_booked_instantly_and_both_sides_are_emailed(): void
    {
        Mail::fake();
        $creator = $this->creator();
        $service = $this->bookingSession($creator, [], ['default_meeting_link' => 'https://meet.google.com/abc-defg-hij']);
        $question = $service->product->checkoutQuestions()->create(['label' => 'What do you want to discuss?', 'field_type' => 'text', 'is_required' => true, 'is_enabled' => true, 'sort_order' => 5]);

        $this->book($creator, $service, '2026-10-05T04:30:00+00:00', ['answers' => [$question->id => 'Career switch']])
            ->assertCreated()
            ->assertJsonPath('booking.meeting_link', 'https://meet.google.com/abc-defg-hij')
            ->assertJsonPath('booking.email', 'rohan@test.com');

        $booking = Booking::firstOrFail();
        $this->assertNull($booking->order_id);
        $this->assertSame('upcoming', $booking->status);
        $this->assertSame('2026-10-05 04:30:00', $booking->scheduled_at->format('Y-m-d H:i:s'));
        $this->assertSame('Career switch', $booking->responses()->value('answer'));
        $this->assertSame('Rohan Kulkarni', $booking->customer->name);

        // views bhi render hone chahiye (fake mail render nahi karta)
        Mail::assertSent(BookingConfirmedMail::class, fn ($m) => $m->hasTo('rohan@test.com')
            && str_contains($m->render(), 'Monday, 5 October 2026') && str_contains($m->render(), '10:00 am') && str_contains($m->render(), 'calendar.google.com'));
        Mail::assertSent(NewBookingMail::class, fn ($m) => $m->hasTo($creator->email)
            && str_contains($m->render(), 'Career switch') && str_contains($m->render(), '9930412847'));

        // slot ab list me nahi, aur creator ke dashboard pe booking dikhti hai
        $this->assertSame(['11:00 am', '12:00 pm'], $this->labels($creator, $service));
        $this->actingAs($creator)->get('/dashboard/bookings')
            ->assertInertia(fn (AssertableInertia $page) => $page->has('bookings.data', 1));
    }

    public function test_the_same_slot_cannot_be_booked_twice(): void
    {
        Mail::fake();
        $creator = $this->creator();
        $service = $this->bookingSession($creator);

        $this->book($creator, $service, '2026-10-05T04:30:00Z')->assertCreated();
        $this->book($creator, $service, '2026-10-05T04:30:00Z', ['phone' => '9820144321'])->assertJsonValidationErrors('slot');

        // jo slot kabhi tha hi nahi (hours ke bahar)
        $this->book($creator, $service, '2026-10-05T10:00:00Z')->assertJsonValidationErrors('slot');
        $this->assertSame(1, Booking::count());
    }

    public function test_required_and_dropdown_answers_are_validated(): void
    {
        $creator = $this->creator();
        $service = $this->bookingSession($creator);
        $topic = $service->product->checkoutQuestions()->create(['label' => 'Topic', 'field_type' => 'dropdown', 'options' => ['Design', 'Career'], 'is_required' => true, 'is_enabled' => true, 'sort_order' => 5]);

        $this->book($creator, $service, '2026-10-05T04:30:00Z')->assertJsonValidationErrors("answers.{$topic->id}");
        $this->book($creator, $service, '2026-10-05T04:30:00Z', ['answers' => [$topic->id => 'Cooking']])->assertJsonValidationErrors("answers.{$topic->id}");
        $this->assertSame(0, Booking::count());
    }

    public function test_paid_inactive_and_unpublished_sessions_cannot_be_booked(): void
    {
        $creator = $this->creator();

        $paid = $this->bookingSession($creator, ['pricing_type' => 'fixed', 'price' => 999]);
        $this->book($creator, $paid, '2026-10-05T04:30:00Z')->assertStatus(422)->assertJsonPath('message', 'Online payment for sessions is coming soon.');

        $inactive = $this->bookingSession($creator, [], ['is_active' => false]);
        $this->book($creator, $inactive, '2026-10-05T04:30:00Z')->assertNotFound();

        $draft = $this->bookingSession($creator, ['status' => 'draft']);
        $this->book($creator, $draft, '2026-10-05T04:30:00Z')->assertNotFound();

        $this->assertSame(0, Booking::count());
    }

    /* ---------------------------------------------------------------- page */

    public function test_booking_page_shows_bookable_flags_and_only_custom_questions(): void
    {
        $creator = $this->creator();
        $free = $this->bookingSession($creator);
        $this->bookingSession($creator, ['pricing_type' => 'fixed', 'price' => 999, 'title' => 'Deep dive']);

        $product = $free->product;
        $product->checkoutQuestions()->createMany([
            ['label' => 'Email address', 'field_type' => 'email', 'is_required' => true, 'is_enabled' => true, 'sort_order' => 0],
            ['label' => 'GSTIN', 'field_type' => 'text', 'is_required' => false, 'is_enabled' => true, 'sort_order' => 1],
            ['label' => 'State', 'field_type' => 'dropdown', 'options' => ['Goa'], 'is_required' => false, 'is_enabled' => true, 'sort_order' => 2],
            ['label' => 'Hidden one', 'field_type' => 'text', 'is_required' => false, 'is_enabled' => false, 'sort_order' => 3],
            ['label' => 'Your goal', 'field_type' => 'text', 'is_required' => true, 'is_enabled' => true, 'sort_order' => 4],
        ]);

        $this->get("/book/{$creator->username}")
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Public/BookingPage')
                ->has('services', 2)
                ->where('services.0.bookable', true)
                ->where('services.1.bookable', false)
                ->has('services.0.questions', 1)
                ->where('services.0.questions.0.label', 'Your goal')
                ->where('timezone', 'Asia/Kolkata')
                ->where('availableWeekdays', [1, 2, 3, 4, 5]));

        $this->getJson("/book/{$creator->username}/slots?service={$product->slug}&date=" . self::MONDAY)
            ->assertOk()
            ->assertJsonCount(3, 'slots')
            ->assertJsonPath('slots.0.start', '2026-10-05T04:30:00+00:00');
    }
}
