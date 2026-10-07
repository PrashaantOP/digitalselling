<?php

namespace App\Services;

use App\Mail\OrderRefundedMail;
use App\Models\Admin;
use App\Models\Booking;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Enrollment;
use App\Models\EventRegistration;
use App\Models\LockedContentUnlock;
use App\Models\NotificationPreference;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/**
 * Poora refund. Do raaste, ek hi hisaab:
 *  - refund()      — admin ne Admin → Orders se dabaya: Razorpay pe paisa wapas, phir applyRefund()
 *  - applyRefund() — Razorpay dashboard se kiya refund webhook (`refund.processed`) se aaya; IDEMPOTENT
 *
 * Refund hote hi: access wapas (main product + add-ons), product / customer ke aankde ghatte, coupon ka use
 * wapas, aur order settle ho chuka ho to creator ke agle settlement se net kat-ta hai (refund_reversal).
 */
class RefundService
{
    public function __construct(private RazorpayService $razorpay, private SettlementService $settlements) {}

    public function refund(Order $order, string $reason, ?Admin $admin = null): Order
    {
        if ($order->status !== 'success') {
            throw ValidationException::withMessages(['order' => 'Only paid orders can be refunded.']);
        }

        $refundId = null;

        if ((float) $order->total_amount > 0) {
            if (! $order->gateway_payment_id) {
                throw ValidationException::withMessages(['order' => 'This order has no Razorpay payment to refund.']);
            }

            try {
                $refund = $this->razorpay->refund($order->gateway_payment_id, null, ['order' => $order->order_number, 'reason' => mb_substr($reason, 0, 200)]);
                $refundId = $refund['id'] ?? null;
            } catch (RequestException $e) {
                report($e);

                throw ValidationException::withMessages(['order' => 'Razorpay could not refund this payment: ' . ($e->response->json('error.description') ?? 'please try again.')]);
            }
        }

        return $this->applyRefund($order, $refundId, $reason, $admin);
    }

    /** System ka apna refund (admin nahi) — jaise der se aayi session payment jiska slot chala gaya. */
    public function applyRefundWithGateway(Order $order, string $reason): Order
    {
        try {
            return $this->refund($order, $reason);
        } catch (ValidationException $e) {
            // Razorpay ne mana kiya — order paid hi rehta hai, admin dashboard se dekh le
            report($e);

            return $order->refresh();
        }
    }

    public function applyRefund(Order $order, ?string $refundId, ?string $reason = null, ?Admin $admin = null): Order
    {
        $applied = false;

        $order = DB::transaction(function () use ($order, $refundId, $reason, $admin, &$applied) {
            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();

            // pehle hi refund ho chuka (admin + webhook dono aaye) ya order kabhi paid hi nahi tha
            if ($order->status !== 'success') {
                return $order;
            }

            $order->forceFill([
                'status' => 'refunded',
                'refund_id' => $refundId ?? $order->refund_id,
                'refund_status' => 'processed',
                'refunded_at' => now(),
                'refund_reason' => $reason !== null ? mb_substr($reason, 0, 255) : $order->refund_reason,
                'refunded_by_admin_id' => $admin?->id,
            ])->save();

            $order->load(['product', 'addonItems.addonProduct', 'customer']);

            $this->revoke($order->product, $order);
            foreach ($order->addonItems as $item) {
                if ($item->addonProduct) {
                    $this->revoke($item->addonProduct, $order);
                }
            }

            // creator ki kamai: settle ho chuka to agle settlement se kaato; warna status badalte hi settlement se bahar
            if ($order->settlement_id && (float) $order->net_payout_amount > 0 && $order->creator) {
                $this->settlements->addAdjustment($order->creator, 'refund_reversal', (float) $order->net_payout_amount, "Refund of {$order->order_number}", $order, $admin);
            }

            Product::whereKey($order->product_id)->update([
                'sales_count' => DB::raw('GREATEST(sales_count - 1, 0)'),
                'revenue_total' => DB::raw('GREATEST(revenue_total - ' . (float) $order->total_amount . ', 0)'),
            ]);

            if ($order->customer_id) {
                Customer::whereKey($order->customer_id)->update([
                    'total_orders' => DB::raw('GREATEST(total_orders - 1, 0)'),
                    'total_spent' => DB::raw('GREATEST(total_spent - ' . (float) $order->total_amount . ', 0)'),
                ]);
            }

            if ($order->coupon_id) {
                Coupon::whereKey($order->coupon_id)->where('used_count', '>', 0)->decrement('used_count');
            }

            $applied = true;

            return $order;
        });

        if ($applied) {
            $this->notify($order);
        }

        return $order;
    }

    /** OrderService::grant() ka ulta. E-book / payment page ka access "success" order se hi hai — status badalte hi band. */
    private function revoke(Product $product, Order $order): void
    {
        switch ($product->type) {
            case 'course':
                $course = $product->courseDetail;
                $enrollment = $course ? Enrollment::where('course_id', $course->id)->where('customer_id', $order->customer_id)->first() : null;

                if (! $enrollment) {
                    return;
                }

                if ((int) $enrollment->order_id === (int) $order->id || $course->access_type !== 'days' || ! $course->access_days) {
                    // isi order se mila access — turant khatam (progress / history rehti hai; dobara kharid pe wapas)
                    $enrollment->forceFill(['access_expires_at' => now()])->save();
                } elseif ($enrollment->access_expires_at) {
                    // dobara kharid ne din badhaye the — sirf utne din wapas
                    $less = $enrollment->access_expires_at->copy()->subDays((int) $course->access_days);
                    $enrollment->forceFill(['access_expires_at' => $less->isPast() ? now() : $less])->save();
                }
                break;

            case 'event':
                EventRegistration::where('order_id', $order->id)->delete();
                break;

            case 'locked_content':
                LockedContentUnlock::where('order_id', $order->id)->delete();
                break;

            case 'booking':
                Booking::where('order_id', $order->id)->where('status', 'upcoming')->update(['status' => 'cancelled']);
                break;
        }
    }

    private function notify(Order $order): void
    {
        $order->loadMissing(['product:id,title,creator_id', 'product.creator']);

        try {
            if ($order->buyer_email) {
                Mail::to($order->buyer_email)->send(new OrderRefundedMail($order, forCreator: false));
            }

            $creator = $order->product?->creator;
            if ($creator && NotificationPreference::wants($creator, 'payment_received')) {
                Mail::to($creator->email)->send(new OrderRefundedMail($order, forCreator: true));
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
