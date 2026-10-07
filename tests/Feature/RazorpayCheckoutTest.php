<?php

namespace Tests\Feature;

use App\Mail\OrderReceiptMail;
use App\Models\Order;
use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\Feature\Concerns\SellsProducts;
use Tests\TestCase;

/**
 * Asli Razorpay se pehle ki pakki jaanch: signature ke baad bhi Razorpay se payment ka order / amount / status
 * dekha jaata hai, "authorized" payment capture hoti hai, aur webhook ka retry dobara kaam nahi karta.
 */
class RazorpayCheckoutTest extends TestCase
{
    use RefreshDatabase, SellsProducts;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeGateways();
    }

    /** Pending order + uska gateway order id */
    private function pendingOrder(): array
    {
        $product = $this->product($this->seller(), 'course', ['price' => 1000]);
        $orderId = $this->checkout($product)->assertCreated()->json('order_id');

        return [Order::where('gateway_order_id', $orderId)->firstOrFail(), $orderId];
    }

    public function test_an_authorized_payment_is_captured_before_access_is_given(): void
    {
        [$order, $orderId] = $this->pendingOrder();
        $this->paymentOverrides['pay_a'] = ['id' => 'pay_a', 'order_id' => $orderId, 'amount' => 100000, 'status' => 'authorized'];

        $this->pay($orderId, 'pay_a')->assertOk();

        Http::assertSent(fn ($r) => $r->method() === 'POST' && str_ends_with($r->url(), '/payments/pay_a/capture') && $r['amount'] === 100000);
        $this->assertSame('success', $order->fresh()->status);
    }

    public function test_a_payment_for_a_different_amount_gives_nothing(): void
    {
        [$order, $orderId] = $this->pendingOrder();
        $this->paymentOverrides['pay_x'] = ['id' => 'pay_x', 'order_id' => $orderId, 'amount' => 100, 'status' => 'captured'];

        $this->pay($orderId, 'pay_x')->assertUnprocessable()->assertJsonValidationErrors('payment');

        $this->assertSame('pending', $order->fresh()->status);
        Mail::assertNotSent(OrderReceiptMail::class);
    }

    public function test_a_payment_made_against_another_order_gives_nothing(): void
    {
        [$order, $orderId] = $this->pendingOrder();
        $this->paymentOverrides['pay_x'] = ['id' => 'pay_x', 'order_id' => 'order_someone_else', 'amount' => 100000, 'status' => 'captured'];

        $this->pay($orderId, 'pay_x')->assertUnprocessable();

        $this->assertSame('pending', $order->fresh()->status);
    }

    public function test_a_payment_that_has_not_completed_waits_for_the_webhook(): void
    {
        [$order, $orderId] = $this->pendingOrder();
        $this->paymentOverrides['pay_x'] = ['id' => 'pay_x', 'order_id' => $orderId, 'amount' => 100000, 'status' => 'failed'];

        $this->pay($orderId, 'pay_x')->assertUnprocessable();

        $this->assertSame('pending', $order->fresh()->status);
    }

    public function test_razorpay_being_unreachable_does_not_break_the_checkout(): void
    {
        [$order, $orderId] = $this->pendingOrder();
        $this->paymentOverrides['pay_x'] = ['error' => ['description' => 'Server error'], 'http_status' => 500];

        $this->pay($orderId, 'pay_x')->assertUnprocessable()->assertJsonPath('errors.payment.0', 'We are confirming your payment. If money was deducted, your access will be emailed to you in a few minutes.');

        $this->assertSame('pending', $order->fresh()->status);
    }

    public function test_the_authorized_webhook_captures_and_gives_access(): void
    {
        [$order, $orderId] = $this->pendingOrder();
        $this->paymentOverrides['pay_w'] = ['id' => 'pay_w', 'order_id' => $orderId, 'amount' => 100000, 'status' => 'authorized'];

        $this->webhook('payment.authorized', $orderId, 100000, 'pay_w')->assertOk()->assertJson(['status' => 'ok']);

        Http::assertSent(fn ($r) => str_ends_with($r->url(), '/payments/pay_w/capture'));
        $this->assertSame('success', $order->fresh()->status);
        $this->assertSame('pay_w', $order->fresh()->gateway_payment_id);
    }

    public function test_the_authorized_webhook_for_a_wrong_amount_is_ignored(): void
    {
        [$order, $orderId] = $this->pendingOrder();
        $this->paymentOverrides['pay_w'] = ['id' => 'pay_w', 'order_id' => $orderId, 'amount' => 500, 'status' => 'authorized'];

        $this->webhook('payment.authorized', $orderId, 500, 'pay_w')->assertOk()->assertJson(['status' => 'amount_mismatch']);

        Http::assertNotSent(fn ($r) => str_ends_with($r->url(), '/capture'));
        $this->assertSame('pending', $order->fresh()->status);
    }

    public function test_a_retried_webhook_event_is_handled_only_once(): void
    {
        [$order, $orderId] = $this->pendingOrder();

        $this->webhook('payment.captured', $orderId, 100000, 'pay_1', 'evt_1')->assertOk()->assertJson(['status' => 'ok']);
        $this->webhook('payment.captured', $orderId, 100000, 'pay_1', 'evt_1')->assertOk()->assertJson(['status' => 'duplicate']);

        $this->assertSame(1, DB::table('razorpay_events')->where('event_id', 'evt_1')->count());
        $this->assertSame('success', $order->fresh()->status);
        Mail::assertSent(OrderReceiptMail::class, 1);
    }

    public function test_unknown_orders_still_get_a_200_so_razorpay_stops_retrying(): void
    {
        $this->webhook('payment.captured', 'order_from_elsewhere', 49900, 'pay_9', 'evt_9')->assertOk()->assertJson(['status' => 'unknown_order']);
    }

    public function test_the_checkout_window_shows_the_creators_store_name(): void
    {
        $creator = $this->seller();
        Store::create(['user_id' => $creator->id, 'username' => $creator->username, 'display_name' => 'Maker Studio']);
        $product = $this->product($creator, 'course', ['title' => 'Clay basics']);

        $this->checkout($product)->assertCreated()->assertJson(['name' => 'Maker Studio', 'description' => 'Clay basics']);

        Http::assertSent(fn ($r) => str_ends_with($r->url(), '/v1/orders') && $r['notes']['product'] === 'Clay basics' && str_starts_with($r['notes']['order_number'], 'ORD-'));
    }
}
