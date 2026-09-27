<?php

namespace Tests\Feature;

use App\Models\AvailabilityException;
use App\Models\Booking;
use App\Models\BookingServiceDetail;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class BookingsDashboardTest extends TestCase
{
    use RefreshDatabase;

    private function creator(): User
    {
        /** @var User $creator */
        $creator = User::factory()->createOne(['role' => 'creator', 'username' => 'coach' . User::count()]);

        return $creator;
    }

    private function service(User $creator, array $detail = []): BookingServiceDetail
    {
        $product = Product::create([
            'creator_id' => $creator->id,
            'type' => 'booking',
            'title' => '1:1 Mentorship',
            'slug' => 'mentorship-' . Product::count(),
            'status' => 'published',
            'pricing_type' => 'fixed',
            'price' => 999,
        ]);

        return BookingServiceDetail::create(['product_id' => $product->id, 'duration_minutes' => 60, 'is_active' => true] + $detail);
    }

    /** $orderStatus null = free booking (bina order). */
    private function booking(BookingServiceDetail $service, ?string $orderStatus = 'success', string $status = 'upcoming', ?string $link = null): Booking
    {
        $creatorId = $service->product->creator_id;
        $customer = Customer::create(['creator_id' => $creatorId, 'name' => 'Priya Sundaram', 'email' => 'priya@test.com', 'phone' => '98' . str_pad((string) (Customer::count() + 1), 8, '0', STR_PAD_LEFT)]);

        $order = $orderStatus ? Order::create([
            'order_number' => 'ORD-' . str_pad((string) (Order::count() + 1), 4, '0', STR_PAD_LEFT),
            'creator_id' => $creatorId,
            'customer_id' => $customer->id,
            'product_id' => $service->product_id,
            'buyer_phone' => $customer->phone,
            'base_amount' => 999,
            'total_amount' => 999,
            'commission_rate' => 10,
            'platform_fee' => 99.9,
            'net_payout_amount' => 899.1,
            'status' => $orderStatus,
            'paid_at' => $orderStatus === 'success' ? now() : null,
        ]) : null;

        return Booking::create([
            'booking_service_id' => $service->id,
            'creator_id' => $creatorId,
            'customer_id' => $customer->id,
            'order_id' => $order?->id,
            'scheduled_at' => now()->addDay(),
            'duration_minutes' => 60,
            'meeting_link' => $link,
            'status' => $status,
        ]);
    }

    public function test_bookings_page_lists_only_confirmed_bookings(): void
    {
        $creator = $this->creator();
        $service = $this->service($creator, ['default_meeting_link' => 'https://meet.example.com/default']);
        $paid = $this->booking($service);
        $free = $this->booking($service, null);
        $this->booking($service, 'pending'); // payment adhoora — creator ko nahi dikhna chahiye
        $this->booking($service, 'success', 'completed');

        $this->actingAs($creator)->get('/dashboard/bookings')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Bookings/Index')
                ->has('bookings.data', 2)
                ->where('bookings.data.0.id', $paid->id)
                ->where('bookings.data.0.session', '1:1 Mentorship')
                // apna link nahi hai to session ka default dikhta hai
                ->where('bookings.data.0.meeting_link', 'https://meet.example.com/default')
                ->where('bookings.data.1.id', $free->id)
                ->where('counts.upcoming', 2)
                ->where('counts.completed', 1)
                ->where('stats.next_7_days', 2)
                ->where('filters.status', 'upcoming'));

        $this->actingAs($creator)->get('/dashboard/bookings?status=all')
            ->assertInertia(fn (AssertableInertia $page) => $page->has('bookings.data', 3));
    }

    public function test_status_can_change_only_once_and_only_for_own_bookings(): void
    {
        $creator = $this->creator();
        $booking = $this->booking($this->service($creator));

        $this->actingAs($this->creator())->put("/dashboard/bookings/{$booking->uuid}/status", ['status' => 'completed'])->assertNotFound();

        $this->actingAs($creator)->put("/dashboard/bookings/{$booking->uuid}/status", ['status' => 'completed'])->assertSessionHasNoErrors();
        $this->assertSame('completed', $booking->fresh()->status);

        $this->actingAs($creator)->put("/dashboard/bookings/{$booking->uuid}/status", ['status' => 'no_show'])->assertStatus(422);
    }

    public function test_meeting_link_override_is_validated_and_scoped(): void
    {
        $creator = $this->creator();
        $booking = $this->booking($this->service($creator));

        $this->actingAs($creator)->put("/dashboard/bookings/{$booking->uuid}/meeting-link", ['meeting_link' => 'javascript:alert(1)'])
            ->assertSessionHasErrors('meeting_link');

        $this->actingAs($creator)->put("/dashboard/bookings/{$booking->uuid}/meeting-link", ['meeting_link' => 'https://zoom.us/j/123'])
            ->assertSessionHasNoErrors();
        $this->assertSame('https://zoom.us/j/123', $booking->fresh()->meeting_link);

        $this->actingAs($this->creator())->put("/dashboard/bookings/{$booking->uuid}/meeting-link", ['meeting_link' => null])->assertNotFound();
    }

    public function test_sessions_can_be_created_with_details_and_published(): void
    {
        $creator = $this->creator();

        $this->actingAs($creator)->post('/dashboard/bookings/sessions', [
            'title' => 'Portfolio review',
            'pricing_type' => 'fixed',
            'price' => 1499,
            'duration_minutes' => 45,
            'default_meeting_link' => 'https://meet.google.com/abc-defg-hij',
        ])->assertSessionHasNoErrors();

        $product = Product::where('creator_id', $creator->id)->where('type', 'booking')->firstOrFail();
        $this->assertSame(45, $product->bookingServiceDetail->duration_minutes);
        $this->assertSame('https://meet.google.com/abc-defg-hij', $product->bookingServiceDetail->default_meeting_link);

        $this->actingAs($creator)->post("/dashboard/bookings/sessions/{$product->uuid}/publish", ['status' => 'published'])->assertSessionHasNoErrors();
        $this->assertSame('published', $product->fresh()->status);

        $this->actingAs($creator)->get('/dashboard/bookings/sessions')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('BookingSessions/Index')->has('items.data', 1)->where('items.data.0.upcoming_count', 0));
    }

    public function test_deleted_session_keeps_its_bookings_visible(): void
    {
        $creator = $this->creator();
        $service = $this->service($creator);
        $this->booking($service);

        $this->actingAs($creator)->delete("/dashboard/bookings/sessions/{$service->product->uuid}")->assertRedirect();

        $this->actingAs($creator)->get('/dashboard/bookings')
            ->assertInertia(fn (AssertableInertia $page) => $page->has('bookings.data', 1)->where('bookings.data.0.session', '1:1 Mentorship'));
    }

    public function test_availability_and_blocked_dates(): void
    {
        $creator = $this->creator();
        $week = collect(range(0, 6))->map(fn ($d) => ['weekday' => $d, 'is_enabled' => $d >= 1 && $d <= 5, 'start_time' => '10:00', 'end_time' => '18:00'])->all();

        $this->actingAs($creator)->put('/dashboard/bookings/settings/availability', ['timezone' => 'Asia/Kolkata', 'week' => $week])->assertSessionHasNoErrors();

        $this->actingAs($creator)->get('/dashboard/bookings/settings')
            ->assertInertia(fn (AssertableInertia $page) => $page->component('Bookings/Settings')->where('week.1.is_enabled', true)->where('week.1.start_time', '10:00')->where('week.0.is_enabled', false));

        $this->actingAs($creator)->post('/dashboard/bookings/settings/exceptions', ['date' => now()->addDays(3)->toDateString(), 'reason' => 'Diwali'])->assertSessionHasNoErrors();
        $exception = AvailabilityException::where('user_id', $creator->id)->firstOrFail();

        $this->actingAs($this->creator())->delete("/dashboard/bookings/exceptions/{$exception->uuid}")->assertNotFound();
        $this->actingAs($creator)->delete("/dashboard/bookings/exceptions/{$exception->uuid}")->assertSessionHasNoErrors();
        $this->assertModelMissing($exception);
    }

    public function test_responses_page_renders(): void
    {
        $creator = $this->creator();
        $booking = $this->booking($this->service($creator));
        $booking->responses()->create(['question_label' => 'What should we cover?', 'answer' => 'My portfolio']);

        $this->actingAs($creator)->get('/dashboard/bookings/responses')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('Bookings/Responses')->has('bookings.data', 1)->where('bookings.data.0.responses.0.answer', 'My portfolio'));
    }
}
