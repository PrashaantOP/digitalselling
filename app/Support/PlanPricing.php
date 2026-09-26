<?php

namespace App\Support;

use App\Models\SubscriptionPlan;
use App\Models\User;

/**
 * Creator plan + commission ka ek hi source. Free = 15%, Pro = 10% (Razorpay gateway charges commission me included).
 * Signup pe 90 din Pro free — users.plan_expires_at; NULL = paid/permanent.
 */
class PlanPricing
{
    public const TRIAL_DAYS = 90;

    // DB me plan row na mile (fresh install) tab bhi sahi rate
    public const FALLBACK_RATES = ['free' => 15.0, 'pro' => 10.0];

    /** 'pro' sirf tab jab plan pro ho aur expiry na ho / future me ho — cron na chale tab bhi sahi. */
    public static function effectivePlan(User $user): string
    {
        if ($user->plan !== 'pro') {
            return 'free';
        }

        return $user->plan_expires_at === null || $user->plan_expires_at->isFuture() ? 'pro' : 'free';
    }

    public static function commissionRate(User $user): float
    {
        $slug = self::effectivePlan($user);
        $rate = SubscriptionPlan::where('slug', $slug)->value('commission_rate');

        return $rate !== null ? (float) $rate : self::FALLBACK_RATES[$slug];
    }

    /** Naye creator ke liye trial attributes (register pe). */
    public static function trialAttributes(): array
    {
        return ['plan' => 'pro', 'plan_expires_at' => now()->addDays(self::TRIAL_DAYS)];
    }

    /** Expired trials ko free pe le aao. Returns kitne users downgrade hue. */
    public static function expireTrials(): int
    {
        return User::where('plan', 'pro')
            ->whereNotNull('plan_expires_at')
            ->where('plan_expires_at', '<=', now())
            ->update(['plan' => 'free', 'plan_expires_at' => null]);
    }
}
