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
