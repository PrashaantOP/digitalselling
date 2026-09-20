<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessSuccessfulOrder;
use App\Models\Order;
use App\Services\RazorpayService;
use Illuminate\Http\Request;

/**
 * POST /webhooks/razorpay  — CSRF/session ke bina (routes/webhooks.php).
 * Controller sirf verify + dispatch karta hai, asli kaam ProcessSuccessfulOrder job me (fast 200 => Razorpay retry nahi karega).
 */
class RazorpayWebhookController extends Controller
{
    public function handle(Request $request, RazorpayService $razorpay)
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
            return response()->json(['status' => 'unknown_order']); // 200 — warna Razorpay baar-baar retry karega
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
}
