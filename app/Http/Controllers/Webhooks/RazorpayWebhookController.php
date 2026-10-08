<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessSuccessfulOrder;
use App\Models\Order;
use App\Models\PlanPurchase;
use App\Services\BillingService;
use App\Services\RazorpayService;
use App\Services\RefundService;
use App\Services\SubscriptionService;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * POST /webhooks/razorpay  — CSRF/session ke bina (routes/webhooks.php).
 *
 * Ek hi webhook sab laata hai:
 *  - buyer ka order (orders, gateway order id se)       → capture pakka karke ProcessSuccessfulOrder (fulfil)
 *  - purani prepaid Plus kharid (plan_purchases)         → BillingService::fulfil()
 *  - Plus auto-renew (`subscription.*`)                  → SubscriptionService
 *  - Razorpay dashboard se kiya refund (`refund.*`)     → RefundService::applyRefund()
 *
 * Har event ka id (X-Razorpay-Event-Id) `razorpay_events` me — Razorpay retry kare to dobara kaam nahi.
 * Pehchaan na ho to bhi 200, warna Razorpay baar-baar bhejta rehta hai.
 */
class RazorpayWebhookController extends Controller
{
    public function __construct(
        private RazorpayService $razorpay,
        private BillingService $billing,
        private SubscriptionService $subscriptions,
        private RefundService $refunds,
    ) {}

    public function handle(Request $request)
    {
        $valid = $this->razorpay->validSignature(
            $request->getContent(),
            $request->header('X-Razorpay-Signature'),
            (string) config('services.razorpay.webhook_secret')
        );

        abort_unless($valid, 400, 'Invalid signature');

        $event = (string) $request->input('event');
        $eventId = $request->header('X-Razorpay-Event-Id');

        if ($eventId) {
            try {
                DB::table('razorpay_events')->insert(['event_id' => mb_substr($eventId, 0, 100), 'event' => mb_substr($event, 0, 60), 'created_at' => now()]);
            } catch (UniqueConstraintViolationException) {
                return response()->json(['status' => 'duplicate']);
            }
        }

        try {
            $status = $this->process($event, $request);
        } catch (\Throwable $e) {
            // kaam poora nahi hua — id hatao taaki Razorpay ka retry dobara try kare
            if ($eventId) {
                DB::table('razorpay_events')->where('event_id', mb_substr($eventId, 0, 100))->delete();
            }

            throw $e;
        }

        return response()->json(['status' => $status]);
    }

    private function process(string $event, Request $request): string
    {
        $payment = $request->input('payload.payment.entity', []) ?: [];

        if (str_starts_with($event, 'subscription.')) {
            return $this->subscriptions->handleWebhook($event, $request->input('payload.subscription.entity', []) ?: [], $payment);
        }

        if (str_starts_with($event, 'refund.')) {
            return $this->refund($event, $request->input('payload.refund.entity', []) ?: []);
        }

        $gatewayOrderId = $payment['order_id'] ?? $request->input('payload.order.entity.id');

        if (! $gatewayOrderId) {
            return 'ignored';
        }

        if ($order = Order::where('gateway_order_id', $gatewayOrderId)->first()) {
            return $this->order($order, $event, $payment);
        }

        if ($purchase = PlanPurchase::where('gateway_order_id', $gatewayOrderId)->first()) {
            return $this->planPurchase($purchase, $event, $payment);
        }

        // jaise auto-renew ke charge ka payment.captured — uska kaam subscription.charged karta hai
        return 'unknown_order';
    }

    private function order(Order $order, string $event, array $payment): string
    {
        $expected = (int) round((float) $order->total_amount * 100);

        if ($event === 'payment.authorized' && ! empty($payment['id'])) {
            // dashboard me auto-capture band ho to bhi paisa pakka karo — warna Razorpay 5 din me lauta deta hai
            $state = $this->razorpay->confirmPayment($payment['id'], $order->gateway_order_id, $expected);

            if ($state === 'mismatch') {
                report(new \RuntimeException("Razorpay payment {$payment['id']} does not match order {$order->order_number}"));

                return 'amount_mismatch';
            }

            if ($state === 'captured') {
                ProcessSuccessfulOrder::dispatch($order->id, $payment['id']);
            }

            return 'ok';
        }

        if (in_array($event, ['payment.captured', 'order.paid'], true)) {
            // amount tampering check (paise)
            $paid = $payment['amount'] ?? null;
            if ($paid !== null && (int) $paid !== $expected) {
                report(new \RuntimeException("Razorpay amount mismatch for order {$order->order_number}"));

                return 'amount_mismatch';
            }

            ProcessSuccessfulOrder::dispatch($order->id, $payment['id'] ?? null);
        } elseif ($event === 'payment.failed' && $order->status === 'pending') {
            $order->update(['status' => 'failed']);
        }

        return 'ok';
    }

    /** Purani prepaid Plus kharid — browser band ho gaya ho tab bhi plan yahin se activate hota hai. */
    private function planPurchase(PlanPurchase $purchase, string $event, array $payment): string
    {
        $expected = (int) round((float) $purchase->amount_payable * 100);

        if ($event === 'payment.authorized' && ! empty($payment['id'])) {
            $state = $this->razorpay->confirmPayment($payment['id'], $purchase->gateway_order_id, $expected);

            if ($state === 'captured') {
                $this->billing->fulfil($purchase, $payment['id']);
            }

            return $state === 'mismatch' ? 'amount_mismatch' : 'ok';
        }

        if (in_array($event, ['payment.captured', 'order.paid'], true)) {
            $paid = $payment['amount'] ?? null;

            if ($paid !== null && (int) $paid !== $expected) {
                report(new \RuntimeException("Razorpay amount mismatch for plan purchase {$purchase->uuid}"));

                return 'amount_mismatch';
            }

            $this->billing->fulfil($purchase, $payment['id'] ?? null);
        } elseif ($event === 'payment.failed') {
            // status pending hi rehne do — creator usi checkout me dobara try kar sakta hai; TTL baad me band kar dega
            $purchase->forceFill(['failure_reason' => mb_substr((string) ($payment['error_description'] ?? 'Payment failed.'), 0, 250)])->save();
        }

        return 'ok';
    }

    /**
     * Refund Razorpay dashboard se hua (ya admin ke refund ka confirmation). Poora refund = order refunded,
     * access band, settlement theek — wahi RefundService jo admin button chalata hai. Aadha refund hum nahi
     * karte, isliye order par sirf flag (admin dekh le).
     */
    private function refund(string $event, array $refund): string
    {
        $order = ! empty($refund['payment_id']) ? Order::where('gateway_payment_id', $refund['payment_id'])->first() : null;

        if (! $order) {
            return 'unknown_payment';
        }

        if ($event === 'refund.failed') {
            report(new \RuntimeException("Razorpay refund " . ($refund['id'] ?? '?') . " failed for order {$order->order_number}"));
            $order->forceFill(['refund_id' => $refund['id'] ?? $order->refund_id, 'refund_status' => 'failed'])->save();

            return 'ok';
        }

        if ($event !== 'refund.processed') {
            return 'ignored';
        }

        if ($order->status === 'refunded') {
            // admin ne yahin se kiya tha — Razorpay ne bas pakka kiya
            $order->forceFill(['refund_id' => $order->refund_id ?? ($refund['id'] ?? null), 'refund_status' => 'processed'])->save();

            return 'ok';
        }

        if ((int) ($refund['amount'] ?? 0) < (int) round((float) $order->total_amount * 100)) {
            report(new \RuntimeException("Partial Razorpay refund " . ($refund['id'] ?? '?') . " on order {$order->order_number} — access was not changed"));
            $order->forceFill(['refund_id' => $refund['id'] ?? null, 'refund_status' => 'partial'])->save();

            return 'partial_refund';
        }

        $this->refunds->applyRefund($order, $refund['id'] ?? null, 'Refunded from the Razorpay dashboard');

        return 'ok';
    }
}
