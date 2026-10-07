<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

/**
 * Razorpay ka patla wrapper — SDK ke bina, Laravel ke Http client se (tests me Http::fake() chal jaata hai).
 * Abhi Pro plan billing isko use karti hai; buyer checkout pipeline bhi yahi use karegi.
 * Saare amounts PAISE me (₹499 => 49900).
 */
class RazorpayService
{
    private const BASE = 'https://api.razorpay.com/v1';

    public function keyId(): string
    {
        return (string) config('services.razorpay.key_id');
    }

    /** Keys .env me hain ya nahi — na hon to checkout shuru hi mat karo. */
    public function configured(): bool
    {
        return $this->keyId() !== '' && (string) config('services.razorpay.key_secret') !== '';
    }

    /** @return array{id: string, amount: int, currency: string, status: string} */
    public function createOrder(int $amountPaise, string $receipt, array $notes = []): array
    {
        return $this->client()->post(self::BASE . '/orders', [
            'amount' => $amountPaise,
            'currency' => 'INR',
            'receipt' => $receipt,
            'notes' => $notes,
        ])->throw()->json();
    }

    public function fetchPayment(string $paymentId): array
    {
        return $this->client()->get(self::BASE . "/payments/{$paymentId}")->throw()->json();
    }

    /**
     * "authorized" payment ko pakka karo. Dashboard me auto-capture on ho to zaroorat nahi padti — par off reh
     * gaya to Razorpay 5 din baad paisa lauta deta, aur hum access de chuke hote.
     */
    public function capture(string $paymentId, int $amountPaise): array
    {
        return $this->client()->post(self::BASE . "/payments/{$paymentId}/capture", [
            'amount' => $amountPaise,
            'currency' => 'INR',
        ])->throw()->json();
    }

    /**
     * Payment sach me is order ki hai, poori rakam ki hai, aur pakki (captured) hai — tabhi access.
     * "authorized" ho to yahin capture kar deta hai. Returns: 'captured' | 'mismatch' | 'not_paid'.
     */
    public function confirmPayment(string $paymentId, string $gatewayOrderId, int $amountPaise): string
    {
        $payment = $this->fetchPayment($paymentId);

        if (($payment['order_id'] ?? null) !== $gatewayOrderId || (int) ($payment['amount'] ?? 0) !== $amountPaise) {
            return 'mismatch';
        }

        $status = $payment['status'] ?? null;

        if ($status === 'authorized') {
            $status = $this->capture($paymentId, $amountPaise)['status'] ?? null;
        }

        return $status === 'captured' ? 'captured' : 'not_paid';
    }

    // ---------------------------------------------------------------- subscriptions (Pro plan auto-renew)

    /** Monthly plan — ek hi baar banta hai (`php artisan billing:razorpay-plan`). */
    public function createPlan(int $amountPaise, string $name, string $description): array
    {
        return $this->client()->post(self::BASE . '/plans', [
            'period' => 'monthly',
            'interval' => 1,
            'item' => ['name' => $name, 'amount' => $amountPaise, 'currency' => 'INR', 'description' => $description],
        ])->throw()->json();
    }

    /** $startAt (unix) do to pehla charge us din — trial ke baad. */
    public function createSubscription(string $planId, array $notes = [], ?int $startAt = null, int $totalCount = 120): array
    {
        return $this->client()->post(self::BASE . '/subscriptions', array_filter([
            'plan_id' => $planId,
            'total_count' => $totalCount,
            'customer_notify' => 1,
            'start_at' => $startAt,
            'notes' => $notes ?: null,
        ], fn ($v) => $v !== null))->throw()->json();
    }

    public function fetchSubscription(string $subscriptionId): array
    {
        return $this->client()->get(self::BASE . "/subscriptions/{$subscriptionId}")->throw()->json();
    }

    /** $atCycleEnd = true: chalu mahina poora chalega, agla charge nahi. */
    public function cancelSubscription(string $subscriptionId, bool $atCycleEnd = true): array
    {
        return $this->client()->post(self::BASE . "/subscriptions/{$subscriptionId}/cancel", [
            'cancel_at_cycle_end' => $atCycleEnd ? 1 : 0,
        ])->throw()->json();
    }

    /** Subscription checkout ke success handler ka signature — "payment_id|subscription_id" pe HMAC. */
    public function validSubscriptionSignature(string $paymentId, string $subscriptionId, ?string $signature): bool
    {
        return $this->validSignature("{$paymentId}|{$subscriptionId}", $signature, (string) config('services.razorpay.key_secret'));
    }

    /** Poora refund ke liye $amountPaise null chhodo. */
    public function refund(string $paymentId, ?int $amountPaise = null, array $notes = []): array
    {
        return $this->client()->post(self::BASE . "/payments/{$paymentId}/refund", array_filter([
            'amount' => $amountPaise,
            'notes' => $notes ?: null,
        ]))->throw()->json();
    }

    /** Webhook body ka signature (X-Razorpay-Signature) — raw body pe HMAC, webhook secret se. */
    public function validSignature(string $payload, ?string $signature, string $secret): bool
    {
        if ($secret === '' || ! $signature) {
            return false;
        }

        return hash_equals(hash_hmac('sha256', $payload, $secret), $signature);
    }

    /** Checkout.js ke success handler ka signature — "order_id|payment_id" pe HMAC, key secret se. */
    public function validPaymentSignature(string $orderId, string $paymentId, ?string $signature): bool
    {
        return $this->validSignature("{$orderId}|{$paymentId}", $signature, (string) config('services.razorpay.key_secret'));
    }

    private function client(): PendingRequest
    {
        return Http::withBasicAuth($this->keyId(), (string) config('services.razorpay.key_secret'))
            ->acceptJson()->asJson()->timeout(20);
    }
}
