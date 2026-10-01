<?php

namespace App\Observers;

use App\Models\Order;
use App\Services\ReferralService;

/**
 * Referral ka ₹200 order ke `success` hone pe milta hai.
 *
 * Hook jaan-bujh ke observer me hai, kisi controller/job me nahi — checkout pipeline
 * (OrderService / ProcessSuccessfulOrder) abhi bana nahi hai, aur jis din bane, ye
 * apne aap chal jayega. Admin panel ya tinker se status badle tab bhi kaam karta hai.
 */
class OrderObserver
{
    public function __construct(private ReferralService $referrals) {}

    public function updated(Order $order): void
    {
        if ($order->wasChanged('status') && $order->status === 'success') {
            $this->referrals->creditFirstSale($order);
        }
    }

    /** Koi order seedhe `success` me create ho (import/seed) to bhi credit mile. */
    public function created(Order $order): void
    {
        if ($order->status === 'success') {
            $this->referrals->creditFirstSale($order);
        }
    }
}
