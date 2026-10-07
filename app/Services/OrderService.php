<?php

namespace App\Services;

use App\Mail\NewSaleMail;
use App\Mail\OrderReceiptMail;
use App\Models\Booking;
use App\Models\CheckoutQuestion;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Enrollment;
use App\Models\EventRegistration;
use App\Models\LockedContentUnlock;
use App\Models\NotificationPreference;
use App\Models\Order;
use App\Models\OrderAddonItem;
use App\Models\OrderCheckoutAnswer;
use App\Models\Product;
use App\Models\ProductAddon;
use App\Support\Phone;
use App\Support\PlanPricing;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Buyer checkout ka poora safar: hisaab (quote) → pending order → Razorpay → fulfil (access dena).
 *
 * fulfil() hi wo EK jagah hai jahan order `success` hota hai aur access milta hai — checkout ka verify call
 * aur Razorpay webhook dono isi ko call karte hain, isliye ye idempotent hai.
 * Order success hote hi baaki cheezein apne aap chalti hain: OrderObserver (referral credit) aur
 * SettlementService (T+2 baad payout).
 */
class OrderService
{
    /** Itne minute me pay na ho to pending order band (orders:expire-pending). */
    public const PENDING_TTL_MINUTES = 30;

    public function __construct(private RazorpayService $razorpay, private CustomerResolver $customers) {}

    /** Product ka abhi ka daam (discount laga ho to wo). Free = 0. */
    public static function unitPrice(Product $product): float
    {
        if ($product->pricing_type === 'free') {
            return 0.0;
        }

        $price = (float) $product->price;
        // discount tabhi jab 0 se zyada aur daam se kam ho — ₹0 / ulta discount kabhi muft ya mehenga nahi banata
        $discounted = $product->has_discount && $product->discounted_price !== null
            && (float) $product->discounted_price > 0 && (float) $product->discounted_price < $price;

        return $discounted ? (float) $product->discounted_price : $price;
    }

    /** Event khatam ho gaya (end time, warna start time beet chuka) — tab registration band. */
    public static function eventEnded(Product $product): bool
    {
        if ($product->type !== 'event') {
            return false;
        }

        $detail = $product->eventDetail;
        $end = $detail?->ends_at ?? $detail?->starts_at;

        return $end !== null && $end->isPast();
    }

    /**
     * "Pay what you want" ka minimum — creator ka `price` (khaali / 0 ho to ₹1). Discount yahan nahi lagta:
     * buyer khud daam chunta hai, aur page pe bhi yahi minimum dikhta hai.
     */
    public static function minimumAmount(Product $product): float
    {
        return max(1.0, round((float) $product->price, 2));
    }

    /**
     * Kharid ka hisaab — checkout page ka live total aur asli order dono isi se, taaki jo dikhe wahi kate.
     *
     * @param  array{coupon_code?: ?string, amount?: mixed, addons?: array<int, int>}  $options
     * @return array{base: float, discount: float, addons: float, total: float, coupon: ?Coupon, addon_rows: Collection<int, ProductAddon>}
     */
    public function quote(Product $product, array $options = []): array
    {
        if (self::eventEnded($product)) {
            throw ValidationException::withMessages(['product' => 'This event has already taken place.']);
        }

        $base = self::unitPrice($product);

        // "Pay what you want": buyer ka amount, par creator ke minimum se kam nahi
        if ($product->pricing_type === 'customer_decides') {
            $amount = round((float) ($options['amount'] ?? 0), 2);
            $minimum = self::minimumAmount($product);

            if ($amount < $minimum) {
                throw ValidationException::withMessages(['amount' => 'The minimum amount is ₹' . number_format($minimum, 2) . '.']);
            }

            $base = $amount;
        }

        $coupon = $this->coupon($product, $options['coupon_code'] ?? null);
        $discount = $coupon ? round($base * (float) $coupon->discount_percent / 100, 2) : 0.0;

        // add-on sirf wahi jo creator ne is product ke saath joda hai aur jo abhi published hai
        $addonIds = collect($options['addons'] ?? [])->map(fn ($id) => (int) $id)->unique();
        $addons = $addonIds->isEmpty() ? collect() : $product->addons()
            ->with('addonProduct')
            ->whereIn('addon_product_id', $addonIds)
            ->whereHas('addonProduct', fn ($q) => $q->where('status', 'published'))
            ->get();

        if ($addons->count() !== $addonIds->count()) {
            throw ValidationException::withMessages(['addons' => 'One of the selected add-ons is no longer available.']);
        }

        // creator ka offer price ho to wahi, warna add-on product ka apna daam
        $addonTotal = round((float) $addons->sum(fn (ProductAddon $a) => $a->effectivePrice()), 2);

        return [
            'base' => round($base, 2),
            'discount' => $discount,
            'addons' => $addonTotal,
            'total' => round($base - $discount + $addonTotal, 2),
            'coupon' => $coupon,
            'addon_rows' => $addons,
        ];
    }

    /**
     * Pending order banao (abhi koi access nahi). $buyer = name/email/phone/gstin/state/note.
     *
     * @param  array{coupon_code?: ?string, amount?: mixed, addons?: array<int, int>, answers?: array<int|string, mixed>}  $options
     */
    public function createPending(Product $product, array $buyer, array $options = []): Order
    {
        $quote = $this->quote($product, $options);
        $answers = $this->answers($product, $options['answers'] ?? []);

        return DB::transaction(function () use ($product, $buyer, $quote, $answers) {
            $customer = $this->customers->forPurchase($product->creator, $buyer);

            // event me ek insaan ek hi baar register hota hai (event_registrations unique)
            if ($product->type === 'event' && $product->eventDetail
                && EventRegistration::where('event_id', $product->eventDetail->id)->where('customer_id', $customer->id)->exists()) {
                throw ValidationException::withMessages(['email' => 'You are already registered for this event.']);
            }

            $order = $this->newOrder($product, $customer, $buyer, $quote);

            // order ke waqt ka daam yahin jam jaata hai — creator baad me offer badle to purana order nahi badalta
            foreach ($quote['addon_rows'] as $addon) {
                OrderAddonItem::create(['order_id' => $order->id, 'addon_product_id' => $addon->addon_product_id, 'price' => $addon->effectivePrice()]);
            }

            foreach ($answers as $questionId => $answer) {
                OrderCheckoutAnswer::create(['order_id' => $order->id, 'checkout_question_id' => $questionId, 'answer' => $answer]);
            }

            return $order->setRelation('customer', $customer);
        });
    }

    /**
     * Paid session: BookingPageController slot ke lock ke andar customer + booking banata hai, order yahan se.
     * Booking row `order_id` ke saath slot ko pay hone tak (SlotService::HOLD_MINUTES) roke rakhti hai.
     */
    public function createPendingForBooking(Product $product, Customer $customer, array $buyer): Order
    {
        $price = self::unitPrice($product);

        return $this->newOrder($product, $customer, $buyer, ['base' => $price, 'discount' => 0.0, 'addons' => 0.0, 'total' => $price, 'coupon' => null])
            ->setRelation('customer', $customer);
    }

    /**
     * Free order → turant fulfil. Paid → Razorpay order + Checkout.js ka payload.
     *
     * @return array<string, mixed> JSON jo checkout page ko jaata hai
     */
    public function initiatePayment(Order $order): array
    {
        $done = url("/checkout/done/{$order->uuid}");

        if ((float) $order->total_amount <= 0) {
            $this->fulfil($order);

            return ['paid' => true, 'redirect' => $done];
        }

        if (! $this->razorpay->configured()) {
            $this->fail($order, 'Payments are not configured.');

            throw ValidationException::withMessages(['payment' => 'Online payments are not available right now. Please try again later.']);
        }

        $order->loadMissing(['product:id,title,creator_id', 'product.creator:id,name', 'product.creator.store:id,user_id,display_name,avatar']);
        $store = $order->product->creator->store;

        $gateway = $this->razorpay->createOrder((int) round((float) $order->total_amount * 100), $order->order_number, [
            'kind' => 'order',
            'order' => $order->uuid,
            'order_number' => $order->order_number,
            'product' => mb_substr((string) $order->product->title, 0, 200),
        ]);

        $order->forceFill(['gateway_order_id' => $gateway['id']])->save();

        return [
            'paid' => false,
            'key' => $this->razorpay->keyId(),
            'order_id' => $gateway['id'],
            'amount' => (int) round((float) $order->total_amount * 100),
            // Razorpay window me creator ka brand
            'name' => $store?->display_name ?: $order->product->creator->name,
            'image' => $store?->avatar ? url('/assets/' . $store->avatar) : null,
            'description' => $order->product->title,
            'prefill' => ['name' => $order->buyer_name, 'email' => $order->buyer_email, 'contact' => $order->buyer_phone],
            'redirect' => $done,
        ];
    }

    /**
     * Payment aa gayi (ya order free hai) — order success karo aur access do. IDEMPOTENT.
     * Caller ki zimmedari: payment sach me hui hai ye pehle verify karna (signature / webhook).
     */
    public function fulfil(Order $order, ?string $paymentId = null): Order
    {
        $justPaid = false;

        $order = DB::transaction(function () use ($order, $paymentId, &$justPaid) {
            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();

            // success ho chuka (verify + webhook dono aaye) ya refund ho gaya — dobara kuch nahi
            if (in_array($order->status, ['success', 'refunded'], true)) {
                return $order;
            }

            $order->forceFill([
                'status' => 'success',
                'paid_at' => now(),
                'gateway_payment_id' => $paymentId ?? $order->gateway_payment_id,
                'failure_reason' => null,
            ])->save();

            $order->load(['product', 'customer', 'addonItems.addonProduct']);

            $this->grant($order->product, $order);
            foreach ($order->addonItems as $item) {
                if ($item->addonProduct) {
                    $this->grant($item->addonProduct, $order);
                }
            }

            if ($order->coupon_id) {
                Coupon::whereKey($order->coupon_id)->increment('used_count');
            }

            Product::whereKey($order->product_id)->update([
                'sales_count' => DB::raw('sales_count + 1'),
                'revenue_total' => DB::raw('revenue_total + ' . (float) $order->total_amount),
            ]);

            if ($order->customer) {
                $order->customer->update([
                    'total_orders' => $order->customer->total_orders + 1,
                    'total_spent' => (float) $order->customer->total_spent + (float) $order->total_amount,
                    'first_purchase_at' => $order->customer->first_purchase_at ?? now(),
                ]);
            }

            $justPaid = true;

            return $order;
        });

        if ($justPaid) {
            // 1:1 session ki payment der se aayi aur slot ab kisi aur ka hai — paisa apne aap wapas, "booking confirmed" nahi
            if ($this->bookingLost($order)) {
                return app(RefundService::class)->applyRefundWithGateway($order, 'The time slot was no longer available when the payment arrived.');
            }

            $this->notify($order);
        }

        return $order;
    }

    /**
     * Paid session ka slot payment aate-aate bacha hai ya nahi. Pending order 30 min me band ho jaata hai (booking
     * cancel) aur slot ka hold 15 min ka hai — uske baad payment aaye to dekho: slot khaali ho to booking wapas
     * pakki, warna true (refund).
     */
    private function bookingLost(Order $order): bool
    {
        $booking = Booking::where('order_id', $order->id)->first();

        if (! $booking) {
            return false;
        }

        $start = $booking->scheduled_at;
        $end = $start->copy()->addMinutes($booking->duration_minutes);

        $taken = Booking::where('creator_id', $booking->creator_id)->whereKeyNot($booking->id)
            ->whereIn('status', ['upcoming', 'completed'])
            ->where('scheduled_at', '<', $end)
            ->where('scheduled_at', '>', $start->copy()->subMinutes(480))
            ->where(fn ($q) => $q->whereNull('order_id')->orWhereHas('order', fn ($o) => $o->where('status', 'success')))
            ->get(['scheduled_at', 'duration_minutes'])
            ->contains(fn (Booking $other) => $other->scheduled_at->copy()->addMinutes($other->duration_minutes)->gt($start));

        if ($taken) {
            return true;
        }

        if ($booking->status === 'cancelled') {
            $booking->forceFill(['status' => 'upcoming'])->save();
        }

        return false;
    }

    public function fail(Order $order, string $reason): void
    {
        Order::whereKey($order->id)->where('status', 'pending')
            ->update(['status' => 'failed', 'failure_reason' => mb_substr($reason, 0, 250)]);
    }

    /** Adhoori chhodi hui checkouts band karo aur unke roke hue session slots chhod do. Returns kitne orders. */
    public function expirePending(): int
    {
        $ids = Order::where('status', 'pending')
            ->where('created_at', '<', now()->subMinutes(self::PENDING_TTL_MINUTES))
            ->pluck('id');

        if ($ids->isEmpty()) {
            return 0;
        }

        Booking::whereIn('order_id', $ids)->where('status', 'upcoming')->update(['status' => 'cancelled']);

        return Order::whereIn('id', $ids)->where('status', 'pending')
            ->update(['status' => 'failed', 'failure_reason' => 'Checkout was not completed.']);
    }

    /** Pay ke baad buyer ko kahan bhejna hai (login ke baad). */
    public function destination(Order $order): string
    {
        $order->loadMissing('product:id,type');

        return match ($order->product?->type) {
            'course' => ($uuid = Enrollment::where('order_id', $order->id)->value('uuid')
                ?? Enrollment::where('customer_id', $order->customer_id)->whereHas('course', fn ($q) => $q->where('product_id', $order->product_id))->value('uuid'))
                ? "/me/courses/{$uuid}/learn" : '/me/courses',
            'booking' => '/me/bookings',
            default => '/me/purchases',
        };
    }

    // ------------------------------------------------------------------ internals

    /** Order row — commission ka snapshot yahin jamta hai, baad me plan badle to purana order nahi badalta. */
    private function newOrder(Product $product, Customer $customer, array $buyer, array $quote): Order
    {
        $rate = PlanPricing::commissionRate($product->creator);
        $fee = round($quote['total'] * $rate / 100, 2);

        return Order::create([
            'order_number' => 'ORD-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6)),
            'creator_id' => $product->creator_id,
            'customer_id' => $customer->id,
            'product_id' => $product->id,
            'buyer_name' => $buyer['name'] ?? null,
            'buyer_email' => Str::lower(trim($buyer['email'])),
            'buyer_phone' => Phone::normalize($buyer['phone']) ?? $buyer['phone'],
            'buyer_gstin' => $buyer['gstin'] ?? null,
            'buyer_state' => $buyer['state'] ?? null,
            'buyer_note' => $buyer['note'] ?? null,
            'coupon_id' => $quote['coupon']?->id,
            'base_amount' => $quote['base'],
            'discount_amount' => $quote['discount'],
            'addon_amount' => $quote['addons'],
            'total_amount' => $quote['total'],
            'commission_rate' => $rate,
            'platform_fee' => $fee,
            'net_payout_amount' => round($quote['total'] - $fee, 2),
            'payment_gateway' => 'razorpay',
            'status' => 'pending',
        ]);
    }

    private function coupon(Product $product, ?string $code): ?Coupon
    {
        $code = strtoupper(trim((string) $code));

        if ($code === '') {
            return null;
        }

        $coupon = Coupon::where('product_id', $product->id)->where('code', $code)->first();

        $usable = $coupon
            && $coupon->is_active
            && (! $coupon->expires_at || $coupon->expires_at->isFuture())
            && ($coupon->usage_limit === null || $coupon->used_count < $coupon->usage_limit);

        if (! $usable) {
            throw ValidationException::withMessages(['coupon_code' => 'This coupon is not valid.']);
        }

        return $coupon;
    }

    /**
     * Creator ke custom sawaalon ke jawab — required hon to server pe bhi zaroori.
     * Email/phone/GSTIN/State upar ke fixed fields me aate hain, yahan nahi.
     *
     * @return array<int, string> question_id => answer
     */
    private function answers(Product $product, array $given): array
    {
        $out = [];
        $errors = [];

        $questions = $product->checkoutQuestions()->where('is_enabled', true)->get()
            ->reject(fn (CheckoutQuestion $q) => in_array($q->field_type, ['email', 'phone'], true) || in_array($q->label, ['State', 'GSTIN'], true));

        foreach ($questions as $question) {
            $answer = trim((string) ($given[$question->id] ?? ''));

            if ($answer === '') {
                if ($question->is_required) {
                    $errors["answers.{$question->id}"] = "{$question->label} is required.";
                }

                continue;
            }

            if ($question->field_type === 'dropdown' && ! in_array($answer, $question->options ?? [], true)) {
                $errors["answers.{$question->id}"] = "Choose a valid option for {$question->label}.";

                continue;
            }

            $out[$question->id] = mb_substr($answer, 0, 255);
        }

        if ($errors) {
            throw ValidationException::withMessages($errors);
        }

        return $out;
    }

    /** Ek product (main ya add-on) ka access is order ke customer ko do. */
    private function grant(Product $product, Order $order): void
    {
        switch ($product->type) {
            case 'course':
                $course = $product->courseDetail;

                if (! $course) {
                    return;
                }

                $enrollment = Enrollment::firstOrNew(['course_id' => $course->id, 'customer_id' => $order->customer_id]);

                if ($course->access_type === 'days' && $course->access_days) {
                    // dobara kharid: bachi hui access ke BAAD se din judte hain
                    $from = $enrollment->access_expires_at?->isFuture() ? $enrollment->access_expires_at : now();
                    $enrollment->access_expires_at = $from->copy()->addDays((int) $course->access_days);
                } else {
                    $enrollment->access_expires_at = null; // lifetime
                }

                if (! $enrollment->exists) {
                    $enrollment->order_id = $order->id;
                    $enrollment->created_at = now();
                }

                $enrollment->save();
                break;

            case 'event':
                if ($product->eventDetail) {
                    EventRegistration::firstOrCreate(
                        ['event_id' => $product->eventDetail->id, 'customer_id' => $order->customer_id],
                        ['order_id' => $order->id, 'registered_at' => now()],
                    );
                }
                break;

            case 'locked_content':
                if ($product->lockedContentDetail) {
                    LockedContentUnlock::firstOrCreate(
                        ['locked_content_id' => $product->lockedContentDetail->id, 'order_id' => $order->id],
                        ['unlocked_at' => now()],
                    );
                }
                break;

                // book / payment_page: success order hi entitlement hai. booking: bookings.order_id se pakki ho jaati hai.
        }
    }

    /** Receipt + creator ko sale ki khabar. Mail fail hone se order fail nahi hota. */
    private function notify(Order $order): void
    {
        $order->loadMissing(['product:id,title,type,creator_id,post_purchase_message', 'product.creator', 'addonItems.addonProduct:id,title']);
        $creator = $order->product?->creator;

        try {
            if ($order->buyer_email) {
                Mail::to($order->buyer_email)->send(new OrderReceiptMail($order));
            }
        } catch (\Throwable $e) {
            report($e);
        }

        try {
            // course ki sale = naya enrollment → "Course enrollment" switch; baaki sab → "Payment received"
            $key = $order->product?->type === 'course' ? 'course_enrollment' : 'payment_received';

            if (NotificationPreference::wants($creator, $key)) {
                Mail::to($creator->email)->send(new NewSaleMail($order));
            }
        } catch (\Throwable $e) {
            report($e);
        }

        // paid session: "booking confirmed" mails ab jaate hain (free booking pe controller turant bhejta hai)
        if ($order->product?->type === 'booking' && ($booking = Booking::where('order_id', $order->id)->first())) {
            app(BookingNotifier::class)->confirmed($booking);
        }
    }
}
