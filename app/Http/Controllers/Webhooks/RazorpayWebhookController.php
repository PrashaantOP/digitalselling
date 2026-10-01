<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessSuccessfulOrder;
use App\Models\Order;
use App\Models\PlanPurchase;
use App\Services\BillingService;
use App\Services\RazorpayService;
use Illuminate\Http\Request;

/**
 * POST /webhooks/razorpay  — CSRF/session ke bina (routes/webhooks.php).
 *
 * Ek hi webhook do tarah ki payments laata hai, gateway order id se pehchaan hoti hai:
 *  - buyer ka order (orders table)  → ProcessSuccessfulOrder job (fast 200 => Razorpay retry nahi karega)
 *  - creator ki Pro plan kharid (plan_purchases) → BillingService::fulfil()
 */
class RazorpayWebhookController extends Controller
{
    public function handle(Request $request, RazorpayService $razorpay, BillingService $billing)
    {
        $valid = $razorpay->validSignature(
            $request->getContent(),
            $request->header('X-Razorpay-Signature'),
            (string) config('services.razorpay.webhook_secret')
        );

        abort_unless($valid, 400, 'Invalid signature');

        $event = $request->input('event');
        $payment = $request->input('payload.payment.entity', []);
        $gatewayOrderId = $payment['order_id'] ?? $request->input('payload.order.entity.id');

        if (! $gatewayOrderId) {
            return response()->json(['status' => 'ignored']);
        }

        $order = Order::where('gateway_order_id', $gatewayOrderId)->first();

        if (! $order) {
            $purchase = PlanPurchase::where('gateway_order_id', $gatewayOrderId)->first();

            return $purchase
                ? $this->planPurchase($purchase, $event, $payment, $billing)
                : response()->json(['status' => 'unknown_order']); // 200 — warna Razorpay baar-baar retry karega
        }

        if (in_array($event, ['payment.captured', 'order.paid'], true)) {
            // amount tampering check (paise)
            $paid = $payment['amount'] ?? null;
            if ($paid !== null && (int) $paid !== (int) round($order->total_amount * 100)) {
                report(new \RuntimeException("Razorpay amount mismatch for order {$order->order_number}"));

                return response()->json(['status' => 'amount_mismatch']);
            }

            ProcessSuccessfulOrder::dispatch($order->id, $payment['id'] ?? null);
        } elseif ($event === 'payment.failed' && $order->status === 'pending') {
            $order->update(['status' => 'failed']);
        }

        return response()->json(['status' => 'ok']);
    }

    /** Creator ne Pro kharida — browser band ho gaya ho tab bhi plan yahin se activate hota hai. */
    private function planPurchase(PlanPurchase $purchase, ?string $event, array $payment, BillingService $billing)
    {
        if (in_array($event, ['payment.captured', 'order.paid'], true)) {
            $paid = $payment['amount'] ?? null;

            if ($paid !== null && (int) $paid !== (int) round((float) $purchase->amount_payable * 100)) {
                report(new \RuntimeException("Razorpay amount mismatch for plan purchase {$purchase->uuid}"));

                return response()->json(['status' => 'amount_mismatch']);
            }

            $billing->fulfil($purchase, $payment['id'] ?? null);
        } elseif ($event === 'payment.failed') {
            // status pending hi rehne do — creator usi checkout me dobara try kar sakta hai; TTL baad me band kar dega
            $purchase->forceFill(['failure_reason' => mb_substr((string) ($payment['error_description'] ?? 'Payment failed.'), 0, 250)])->save();
        }

        return response()->json(['status' => 'ok']);
    }
}
