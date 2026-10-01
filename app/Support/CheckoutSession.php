<?php

namespace App\Support;

use App\Models\Order;

/**
 * Jis browser ne order banaya, usi ko pay ke baad wala "done" page aur uske OTP actions milte hain —
 * order ka uuid kisi aur ke haath lag jaye to bhi uske kaam ka nahi.
 *
 * `new_buyer` yaad rakhta hai ki is order ne buyer account banaya tha ya nahi: sirf tabhi done page se
 * mobile verify hota hai aur email sudhaara ja sakta hai (purane buyer ka account yahan se nahi chhua jaata).
 */
class CheckoutSession
{
    private const KEY = 'checkout_orders';

    /** Session me itne hi orders yaad rakho — purane apne aap nikal jaate hain. */
    private const KEEP = 10;

    public static function remember(Order $order, bool $newBuyer): void
    {
        $orders = session(self::KEY, []);
        $orders[$order->uuid] = ['new_buyer' => $newBuyer];

        session([self::KEY => array_slice($orders, -self::KEEP, null, true)]);
    }

    public static function has(Order $order): bool
    {
        return array_key_exists($order->uuid, session(self::KEY, []));
    }

    public static function createdBuyer(Order $order): bool
    {
        return (bool) (session(self::KEY, [])[$order->uuid]['new_buyer'] ?? false);
    }
}
