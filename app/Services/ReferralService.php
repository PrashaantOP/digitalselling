<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Referral;
use App\Models\ReferralCode;
use App\Models\ReferralCredit;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Refer & Earn ka pura logic.
 *
 * Niyam: 1 referral = ₹200, par credit tabhi milta hai jab referred creator apni
 * PEHLI successful sale kare (sirf signup pe nahi — warna fake emails se paisa ban jaata).
 * Ye credit bank me withdraw nahi hota — sirf Pro subscription me redeem hota hai
 * (₹499 = 1 mahina), aur wo bhi maujooda `plan_expires_at` mechanism se, Razorpay ko chhue bina.
 */
class ReferralService
{
    /** Har successful referral pe referrer ko itna credit. */
    public const REWARD = 200;

    private const FALLBACK_MONTHLY_PRICE = 499.0;

    /** Ek mahine Pro ki keemat — plans table se, hardcode nahi. */
    public function monthlyPrice(): float
    {
        $price = (float) SubscriptionPlan::where('slug', 'pro')->value('monthly_price');

        return $price > 0 ? $price : self::FALLBACK_MONTHLY_PRICE;
    }

    /** Creator ka referral code (na ho to bana do). */
    public function codeFor(User $user): ReferralCode
    {
        return ReferralCode::firstOrCreate(
            ['user_id' => $user->id],
            ['code' => $this->uniqueCode()],
        );
    }

    /**
     * Signup pe referral jodo. Har galti chup-chaap ignore hoti hai —
     * referral ki wajah se kisi ka registration kabhi fail nahi hona chahiye.
     */
    public function attach(User $newUser, ?string $code): ?Referral
    {
        $code = trim((string) $code);

        if ($code === '') {
            return null;
        }

        $referrer = ReferralCode::where('code', strtoupper($code))->first()?->user;

        // unknown code, khud ka code, ya ye user pehle se kisi ka referral hai
        if (! $referrer || $referrer->id === $newUser->id || Referral::where('referred_user_id', $newUser->id)->exists()) {
            return null;
        }

        return Referral::create([
            'referrer_id' => $referrer->id,
            'referred_user_id' => $newUser->id,
            'status' => 'signed_up',
            'total_earnings' => 0,
            'joined_at' => now(),
        ]);
    }

    /**
     * Referred creator ki pehli successful sale → referrer ko ₹200.
     * Idempotent: dobara call ho, ya us creator ki aur sales aayein, credit sirf ek baar milta hai.
     */
    public function creditFirstSale(Order $order): ?ReferralCredit
    {
        $referral = Referral::where('referred_user_id', $order->creator_id)->whereNull('rewarded_at')->first();

        if (! $referral) {
            return null;
        }

        try {
            return DB::transaction(function () use ($referral, $order) {
                // lock le kar dobara padho — do webhooks ek saath aayein to bhi ek hi credit bane
                $locked = Referral::whereKey($referral->id)->lockForUpdate()->first();

                if (! $locked || $locked->rewarded_at !== null) {
                    return null;
                }

                $credit = ReferralCredit::create([
                    'user_id' => $locked->referrer_id,
                    'referral_id' => $locked->id,
                    'type' => 'earned',
                    'amount' => self::REWARD,
                    'description' => 'First sale by ' . ($locked->referredUser?->name ?? 'your referral'),
                    'meta' => ['order_id' => $order->id, 'order_number' => $order->order_number],
                ]);

                $locked->forceFill([
                    'status' => 'earning',
                    'total_earnings' => (float) $locked->total_earnings + self::REWARD,
                    'rewarded_at' => now(),
                ])->save();

                return $credit;
            });
        } catch (QueryException $e) {
            // unique(referral_id, type) — race me doosri koshish yahin ruk jaati hai
            return null;
        }
    }

    /** Referred creator ne apna pehla product publish kiya — list me progress dikhane ke liye. */
    public function markActive(User $referredUser): void
    {
        Referral::where('referred_user_id', $referredUser->id)
            ->where('status', 'signed_up')
            ->update(['status' => 'active']);
    }

    /**
     * Paisa kahan khada hai.
     *
     * @return array{earned: float, redeemed: float, balance: float, monthly_price: float, months_available: int}
     */
    public function balanceFor(User $user): array
    {
        $sum = fn (string $type) => (float) ReferralCredit::where('user_id', $user->id)->where('type', $type)->sum('amount');

        $earned = $sum('earned');
        $redeemed = $sum('redeemed');
        $balance = round($earned - $redeemed, 2);
        $price = $this->monthlyPrice();

        return [
            'earned' => $earned,
            'redeemed' => $redeemed,
            'balance' => $balance,
            'monthly_price' => $price,
            'months_available' => (int) floor($balance / $price),
        ];
    }

    /**
     * Paid Razorpay subscription wale creator ka `plan_expires_at` null hota hai —
     * usme mahine jodne ka koi matlab nahi, isliye redemption tab block rehta hai.
     */
    public function blockedReason(User $user): ?string
    {
        $hasPaidSubscription = \App\Models\Subscription::where('user_id', $user->id)->where('status', 'active')->exists();

        return $hasPaidSubscription && $user->plan_expires_at === null ? 'paid_subscription' : null;
    }

    /** Credit → Pro. Poore mahine hi (₹499 = 1 mahina); bacha hua balance wallet me rehta hai. */
    public function redeem(User $user, int $months): ReferralCredit
    {
        if ($months < 1) {
            throw ValidationException::withMessages(['months' => 'Choose at least one month.']);
        }

        if ($this->blockedReason($user) === 'paid_subscription') {
            throw ValidationException::withMessages([
                'months' => 'Your paid Pro subscription is active — you can use this credit once it ends.',
            ]);
        }

        return DB::transaction(function () use ($user, $months) {
            // do parallel redeem se balance negative na ho
            User::whereKey($user->id)->lockForUpdate()->first();

            $balance = $this->balanceFor($user);
            $cost = round($months * $balance['monthly_price'], 2);

            if ($cost > $balance['balance']) {
                throw ValidationException::withMessages(['months' => 'You do not have enough referral credit for that.']);
            }

            $fresh = $user->fresh();
            $before = $fresh->plan_expires_at;

            // free ho to abhi se, Pro (trial/credit) chal rahi ho to uske aage se
            $start = $before && $before->isFuture() ? $before : now();

            $fresh->forceFill([
                'plan' => 'pro',
                'plan_expires_at' => $start->copy()->addMonthsNoOverflow($months),
            ])->save();

            return ReferralCredit::create([
                'user_id' => $user->id,
                'referral_id' => null,
                'type' => 'redeemed',
                'amount' => $cost,
                'description' => $months . ' month' . ($months > 1 ? 's' : '') . ' of Pro',
                'meta' => [
                    'months' => $months,
                    'plan_expires_at_before' => $before?->toIso8601String(),
                    'plan_expires_at_after' => $fresh->plan_expires_at?->toIso8601String(),
                ],
            ]);
        });
    }

    private function uniqueCode(): string
    {
        do {
            $code = strtoupper(\Illuminate\Support\Str::random(8));
        } while (ReferralCode::where('code', $code)->exists());

        return $code;
    }
}
