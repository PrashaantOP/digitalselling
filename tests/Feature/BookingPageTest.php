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
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class BookingPageTest extends TestCase
{
    use RefreshDatabase;

    /** Monday 5 Oct 2026 — creator ke hours 10:00–13:00 IST (= 04:30–07:30 UTC). */
    private const MONDAY = '2026-10-05';

    private int $gatewayOrders = 0;

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

    private function fakeRazorpay(): void
    {
        config(['services.razorpay.key_id' => 'rzp_test_key', 'services.razorpay.key_secret' => 'test_secret']);
        Http::fake([
            'api.razorpay.com/v1/orders' => fn () => Http::response(['id' => 'order_S' . (++$this->gatewayOrders), 'status' => 'created']),
            'api.razorpay.com/v1/payments/*/refund' => Http::response(['id' => 'rfnd_s1', 'status' => 'processed']),
            // verify Razorpay se pucchta hai: isi order ki, poori rakam ki, captured? (pay_sN → order_SN)
            'api.razorpay.com/v1/payments/*' => function ($request) {
                $orderId = 'order_S' . substr(basename(parse_url($request->url(), PHP_URL_PATH)), 5);

                return Http::response([
                    'id' => 'pay', 'order_id' => $orderId, 'status' => 'captured',
                    'amount' => (int) round((float) Order::where('gateway_order_id', $orderId)->value('total_amount') * 100),
                ]);
            },
        ]);
        config(['inertia.ssr.enabled' => false]); // SSR ka localhost call stray request na bane
        Http::preventStrayRequests();
    }

    private function payFor(string $gatewayOrderId, string $paymentId = 'pay_s1')
    {
        return $this->postJson('/checkout/verify', [
            'razorpay_order_id' => $gatewayOrderId,
            'razorpay_payment_id' => $paymentId,
            'razorpay_signature' => hash_hmac('sha256', "{$gatewayOrderId}|{$paymentId}", 'test_secret'),
        ]);
    }

    public function test_paid_session_holds_the_slot_and_is_confirmed_only_after_payment(): void
    {
        Mail::fake();
        $this->fakeRazorpay();
        $creator = $this->creator();
        $service = $this->bookingSession($creator, ['pricing_type' => 'fixed', 'price' => 999]);

        $this->book($creator, $service, '2026-10-05T04:30:00Z')->assertCreated()
            ->assertJsonPath('payment.paid', false)->assertJsonPath('payment.order_id', 'order_S1')->assertJsonPath('payment.amount', 99900);

        $booking = Booking::firstOrFail();
        $this->assertSame('pending', $booking->order->status);
        // slot ruka hua hai, par creator ki list me abhi nahi aur koi mail nahi
        $this->assertSame(['11:00 am', '12:00 pm'], $this->labels($creator, $service));
        $this->actingAs($creator)->get('/dashboard/bookings')->assertInertia(fn (AssertableInertia $page) => $page->has('bookings.data', 0));
        Mail::assertNothingSent();

        $this->payFor('order_S1')->assertOk()->assertJson(['paid' => true]);

        $this->assertSame('success', $booking->order->fresh()->status);
        $this->assertSame('849.15', $booking->order->fresh()->net_payout_amount); // 15% commission
        $this->actingAs($creator)->get('/dashboard/bookings')->assertInertia(fn (AssertableInertia $page) => $page->has('bookings.data', 1));
        Mail::assertSent(BookingConfirmedMail::class, fn ($m) => $m->hasTo('rohan@test.com'));
        Mail::assertSent(NewBookingMail::class, fn ($m) => $m->hasTo($creator->email));
    }

    public function test_an_unpaid_hold_blocks_others_briefly_then_frees_the_slot(): void
    {
        $this->fakeRazorpay();
        $creator = $this->creator();
        $service = $this->bookingSession($creator, ['pricing_type' => 'fixed', 'price' => 999]);

        $this->book($creator, $service, '2026-10-05T04:30:00Z')->assertCreated();

        // doosra insaan wahi slot: abhi nahi
        $this->book($creator, $service, '2026-10-05T04:30:00Z', ['email' => 'meera@test.com', 'phone' => '9820144321'])->assertJsonValidationErrors('slot');

        // pay nahi hua — scheduler order band karta hai aur slot wapas khaali
        Booking::first()->order->forceFill(['created_at' => now()->subHour()])->save();
        $this->artisan('orders:expire-pending')->assertSuccessful();

        $this->assertSame('cancelled', Booking::first()->status);
        $this->assertSame(['10:00 am', '11:00 am', '12:00 pm'], $this->labels($creator, $service));
    }

    public function test_a_late_payment_still_gets_the_slot_when_nobody_took_it(): void
    {
        Mail::fake();
        $this->fakeRazorpay();
        $creator = $this->creator();
        $service = $this->bookingSession($creator, ['pricing_type' => 'fixed', 'price' => 999]);

        $this->book($creator, $service, '2026-10-05T04:30:00Z')->assertCreated();
        Booking::first()->order->forceFill(['created_at' => now()->subHour()])->save();
        $this->artisan('orders:expire-pending')->assertSuccessful();

        // 30 min baad paisa aaya — slot abhi bhi khaali, to booking wapas pakki
        $this->payFor('order_S1')->assertOk();

        $this->assertSame('success', Booking::first()->order->status);
        $this->assertSame('upcoming', Booking::first()->status);
        Mail::assertSent(BookingConfirmedMail::class);
        Http::assertNotSent(fn ($r) => str_ends_with($r->url(), '/refund'));
    }

    public function test_a_late_payment_for_a_slot_someone_else_booked_is_refunded(): void
    {
        Mail::fake();
        $this->fakeRazorpay();
        $creator = $this->creator();
        $service = $this->bookingSession($creator, ['pricing_type' => 'fixed', 'price' => 999]);

        $this->book($creator, $service, '2026-10-05T04:30:00Z')->assertCreated();
        Booking::first()->order->forceFill(['created_at' => now()->subHour()])->save();
        $this->artisan('orders:expire-pending')->assertSuccessful();

        // slot khaali hua, Meera ne book karke pay bhi kar diya
        $this->book($creator, $service, '2026-10-05T04:30:00Z', ['email' => 'meera@test.com', 'phone' => '9820144321'])->assertCreated();
        $this->payFor('order_S2', 'pay_s2')->assertOk();

        // ab Rohan ka paisa aaya — slot Meera ka hai, isliye Rohan ko poora refund
        $this->payFor('order_S1')->assertUnprocessable()->assertJsonValidationErrors('payment');

        $rohan = Order::where('gateway_order_id', 'order_S1')->firstOrFail();
        $this->assertSame('refunded', $rohan->status);
        $this->assertSame('rfnd_s1', $rohan->refund_id);
        $this->assertSame('cancelled', Booking::where('order_id', $rohan->id)->value('status'));
        $this->assertSame('upcoming', Booking::where('order_id', Order::where('gateway_order_id', 'order_S2')->value('id'))->value('status'));
        Http::assertSent(fn ($r) => str_ends_with($r->url(), '/payments/pay_s1/refund'));
        Mail::assertSent(\App\Mail\OrderRefundedMail::class, fn ($m) => $m->hasTo('rohan@test.com'));
        Mail::assertNotSent(BookingConfirmedMail::class, fn ($m) => $m->hasTo('rohan@test.com'));
    }

    public function test_inactive_and_unpublished_sessions_cannot_be_booked(): void
    {
        $creator = $this->creator();

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
                ->where('services.1.bookable', true) // paid session bhi ab book hota hai
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
