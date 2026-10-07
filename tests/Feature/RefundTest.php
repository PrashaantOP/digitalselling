<?php

namespace Tests\Feature;

use App\Mail\OrderRefundedMail;
use App\Models\Admin;
use App\Models\AdminAuditLog;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Enrollment;
use App\Models\EventRegistration;
use App\Models\LockedContentUnlock;
use App\Models\Order;
use App\Models\PayoutMethod;
use App\Models\Product;
use App\Models\ProductAddon;
use App\Models\Settlement;
use App\Models\SettlementAdjustment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Feature\Concerns\SellsProducts;
use Tests\TestCase;

/**
 * Poora refund — sirf admin (Admin → Orders), ya Razorpay dashboard se kiya refund jo webhook se aata hai.
 * Dono me ek hi hisaab: paisa wapas, access band (add-ons bhi), aankde ghate, settle ho chuka ho to agle settlement se kategi.
 */
class RefundTest extends TestCase
{
    use RefreshDatabase, SellsProducts;

    private Admin $admin;

    private User $creator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeGateways();

        $this->admin = new Admin(['name' => 'Ops', 'email' => 'ops@platform.test']);
        $this->admin->forceFill(['password' => 'Sup3r$ecretPass', 'is_active' => true])->save();
        $this->creator = $this->seller();
    }

    private function refund(Order $order, string $reason = 'Buyer could not open the course')
    {
        return $this->actingAs($this->admin, 'admin')->post("/admin/orders/{$order->uuid}/refund", ['reason' => $reason]);
    }

    private function refundWebhook(string $event, Order $order, ?int $paise = null, string $refundId = 'rfnd_dash', ?string $eventId = null)
    {
        return $this->signedWebhook(['event' => $event, 'payload' => ['refund' => ['entity' => [
            'id' => $refundId,
            'payment_id' => $order->gateway_payment_id,
            'amount' => $paise ?? (int) round((float) $order->total_amount * 100),
            'status' => $event === 'refund.failed' ? 'failed' : 'processed',
        ]]]], $eventId);
    }

    // ---------------------------------------------------------------- admin refund

    public function test_admin_refund_returns_the_money_and_ends_course_access(): void
    {
        $course = $this->product($this->creator, 'course', ['price' => 1000]);
        $order = $this->buy($course);
        $this->assertTrue(Enrollment::where('customer_id', $order->customer_id)->first()->access_expires_at === null);

        $this->refund($order)->assertRedirect()->assertSessionHasNoErrors();

        $order->refresh();
        $this->assertSame('refunded', $order->status);
        $this->assertSame('rfnd_1', $order->refund_id);
        $this->assertSame('Buyer could not open the course', $order->refund_reason);
        $this->assertSame($this->admin->id, $order->refunded_by_admin_id);
        $this->assertNotNull($order->refunded_at);
        Http::assertSent(fn ($r) => $r->method() === 'POST' && str_ends_with($r->url(), "/payments/{$order->gateway_payment_id}/refund"));

        // access band — enrollment rehta hai (progress), par khatam
        $this->assertTrue(Enrollment::where('customer_id', $order->customer_id)->first()->access_expires_at->lte(now()));
        $this->assertSame(0, (int) Product::find($course->id)->sales_count);
        $this->assertSame(0, (int) Customer::find($order->customer_id)->total_orders);

        // settle nahi hua tha — kaatne ko kuch nahi, status badalte hi settlement se bahar
        $this->assertSame(0, SettlementAdjustment::count());

        Mail::assertSent(OrderRefundedMail::class, fn ($m) => $m->hasTo('rohan@test.com') && ! $m->forCreator);
        Mail::assertSent(OrderRefundedMail::class, fn ($m) => $m->hasTo($this->creator->email) && $m->forCreator);
        $this->assertTrue(AdminAuditLog::where('action', 'order.refunded')->where('admin_id', $this->admin->id)->exists());
    }

    public function test_a_settled_order_is_taken_back_from_the_next_settlement(): void
    {
        $order = $this->buy($this->product($this->creator, 'book', ['price' => 1000]));
        $settlement = Settlement::create([
            'number' => 'STL-TEST-1', 'creator_id' => $this->creator->id, 'orders_count' => 1,
            'payout_method_id' => PayoutMethod::create(['user_id' => $this->creator->id, 'type' => 'upi', 'upi_id' => 'maker@okaxis', 'is_default' => true])->id, 'gross_amount' => 1000,
            'commission_amount' => 150, 'adjustment_amount' => 0, 'net_amount' => 850, 'period_start' => now(), 'period_end' => now(), 'status' => 'paid',
        ]);
        $order->forceFill(['settlement_id' => $settlement->id])->save();

        $this->refund($order)->assertSessionHasNoErrors();

        $adjustment = SettlementAdjustment::sole();
        $this->assertSame('refund_reversal', $adjustment->type);
        $this->assertSame($order->id, $adjustment->order_id);
        $this->assertEquals(-850, (float) $adjustment->amount);
    }

    public function test_event_seats_and_locked_content_are_taken_back(): void
    {
        $event = $this->buy($this->product($this->creator, 'event', ['price' => 500]));
        $locked = $this->buy($this->product($this->creator, 'locked_content', ['price' => 300]), ['email' => 'meera@test.com', 'phone' => '9820144321']);
        $this->assertSame(1, EventRegistration::count());
        $this->assertSame(1, LockedContentUnlock::count());

        $this->refund($event)->assertSessionHasNoErrors();
        $this->refund($locked)->assertSessionHasNoErrors();

        $this->assertSame(0, EventRegistration::count());
        $this->assertSame(0, LockedContentUnlock::count());
    }

    public function test_add_ons_bought_with_the_order_lose_access_too(): void
    {
        $course = $this->product($this->creator, 'course', ['price' => 1000]);
        $bonus = $this->product($this->creator, 'course', ['price' => 500]);
        ProductAddon::create(['product_id' => $course->id, 'addon_product_id' => $bonus->id, 'sort_order' => 1]);

        $order = $this->buy($course, ['addons' => [$bonus->id]]);
        $this->assertSame(2, Enrollment::whereNull('access_expires_at')->count());

        $this->refund($order)->assertSessionHasNoErrors();

        $this->assertSame(0, Enrollment::whereNull('access_expires_at')->count());
    }

    public function test_the_coupon_use_is_given_back(): void
    {
        $product = $this->product($this->creator, 'book', ['price' => 1000]);
        Coupon::create(['product_id' => $product->id, 'code' => 'SAVE10', 'discount_percent' => 10, 'is_active' => true]);
        $order = $this->buy($product, ['coupon_code' => 'SAVE10']);
        $this->assertSame(1, (int) Coupon::first()->used_count);

        $this->refund($order)->assertSessionHasNoErrors();

        $this->assertSame(0, (int) Coupon::first()->used_count);
    }

    public function test_only_paid_orders_can_be_refunded(): void
    {
        $product = $this->product($this->creator, 'book');
        $this->checkout($product)->assertCreated();
        $pending = Order::firstOrFail();

        $this->refund($pending)->assertStatus(422);

        $this->assertSame('pending', $pending->fresh()->status);
        Http::assertNotSent(fn ($r) => str_ends_with($r->url(), '/refund'));
    }

    public function test_an_order_cannot_be_refunded_twice(): void
    {
        $order = $this->buy($this->product($this->creator, 'book'));
        $this->refund($order)->assertSessionHasNoErrors();

        $this->refund($order)->assertStatus(422);

        Http::assertSentCount(3); // order + payment fetch + ek hi refund
    }

    public function test_when_razorpay_refuses_the_order_stays_paid(): void
    {
        $order = $this->buy($this->product($this->creator, 'course'));
        $this->refundFails = true;

        $this->refund($order)->assertSessionHasErrors('order');

        $this->assertSame('success', $order->fresh()->status);
        $this->assertSame(1, Enrollment::whereNull('access_expires_at')->count());
        Mail::assertNotSent(OrderRefundedMail::class);
    }

    public function test_a_reason_is_required(): void
    {
        $order = $this->buy($this->product($this->creator, 'book'));

        $this->refund($order, '')->assertSessionHasErrors('reason');

        $this->assertSame('success', $order->fresh()->status);
    }

    public function test_creators_and_buyers_cannot_reach_the_refund_action(): void
    {
        $order = $this->buy($this->product($this->creator, 'book'));

        $this->actingAs($this->creator)->post("/admin/orders/{$order->uuid}/refund", ['reason' => 'x'])->assertRedirect('/admin/login');
        $this->post("/admin/orders/{$order->id}/refund", ['reason' => 'x'])->assertNotFound(); // numeric id kabhi nahi

        $this->assertSame('success', $order->fresh()->status);
    }

    public function test_admin_order_page_shows_the_refund(): void
    {
        $order = $this->buy($this->product($this->creator, 'book'));
        $this->refund($order);

        $this->actingAs($this->admin, 'admin')->get("/admin/orders/{$order->uuid}")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('order.status', 'refunded')
            ->where('order.refund_id', 'rfnd_1')
            ->where('order.refund_reason', 'Buyer could not open the course')
            ->whereNot('order.refunded_at', null)
        );
    }

    // ---------------------------------------------------------------- Razorpay dashboard se refund (webhook)

    public function test_a_full_refund_from_the_razorpay_dashboard_is_applied_once(): void
    {
        $order = $this->buy($this->product($this->creator, 'course'));

        $this->refundWebhook('refund.processed', $order, eventId: 'evt_r1')->assertOk()->assertJson(['status' => 'ok']);
        $this->refundWebhook('refund.processed', $order, eventId: 'evt_r1')->assertOk()->assertJson(['status' => 'duplicate']);
        $this->refundWebhook('refund.processed', $order, eventId: 'evt_r2')->assertOk(); // Razorpay ne naye id se bheja

        $order->refresh();
        $this->assertSame('refunded', $order->status);
        $this->assertSame('rfnd_dash', $order->refund_id);
        $this->assertSame('Refunded from the Razorpay dashboard', $order->refund_reason);
        $this->assertNull($order->refunded_by_admin_id);
        $this->assertSame(0, Enrollment::whereNull('access_expires_at')->count());
        Mail::assertSent(OrderRefundedMail::class, fn ($m) => $m->hasTo('rohan@test.com'));
        $this->assertCount(1, Mail::sent(OrderRefundedMail::class, fn ($m) => $m->hasTo('rohan@test.com')));
        Http::assertNotSent(fn ($r) => str_ends_with($r->url(), '/refund')); // paisa Razorpay pe pehle hi lauta
    }

    public function test_the_webhook_after_an_admin_refund_only_confirms_it(): void
    {
        $order = $this->buy($this->product($this->creator, 'book'));
        $this->refund($order);

        $this->refundWebhook('refund.processed', $order->fresh(), refundId: 'rfnd_1')->assertOk();

        $this->assertSame('processed', $order->fresh()->refund_status);
        $this->assertSame($this->admin->id, $order->fresh()->refunded_by_admin_id);
        $this->assertCount(1, Mail::sent(OrderRefundedMail::class, fn ($m) => $m->hasTo('rohan@test.com')));
    }

    public function test_a_partial_dashboard_refund_only_flags_the_order(): void
    {
        $order = $this->buy($this->product($this->creator, 'course', ['price' => 1000]));

        $this->refundWebhook('refund.processed', $order, 40000)->assertOk()->assertJson(['status' => 'partial_refund']);

        $this->assertSame('success', $order->fresh()->status);
        $this->assertSame('partial', $order->fresh()->refund_status);
        $this->assertSame(1, Enrollment::whereNull('access_expires_at')->count());
    }

    public function test_a_failed_refund_is_flagged_for_the_admin(): void
    {
        $order = $this->buy($this->product($this->creator, 'book'));
        $this->refund($order);

        $this->refundWebhook('refund.failed', $order->fresh(), refundId: 'rfnd_1')->assertOk();

        $this->assertSame('failed', $order->fresh()->refund_status);
    }
}
