<?php

namespace App\Jobs;

use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Foundation\Bus\Dispatchable;

/**
 * Razorpay webhook ne payment confirm ki — order fulfil karo (access do).
 *
 * Jaan-bujh ke ShouldQueue NAHI hai: `dispatch()` ise usi request me chala deta hai, taaki queue worker
 * na chal raha ho tab bhi buyer ko access mile. Kaam chhota hai aur OrderService::fulfil() idempotent hai,
 * isliye Razorpay ka retry ya checkout ka verify call saath aaye to bhi kuch dobara nahi hota.
 */
class ProcessSuccessfulOrder
{
    use Dispatchable;

    public function __construct(public int $orderId, public ?string $paymentId = null) {}

    public function handle(OrderService $orders): void
    {
        $order = Order::find($this->orderId);

        if ($order) {
            $orders->fulfil($order, $this->paymentId);
        }
    }
}
