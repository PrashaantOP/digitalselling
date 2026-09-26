<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Platform ke sirf do plan: Free (15%) aur Pro (₹499/month, 10%). Commission me Razorpay gateway charges included.
     * Purane/extra plans (jaise dummy seeder ka pro-monthly) band — landing pe sirf yahi do dikhne chahiye.
     */
    public function up(): void
    {
        $now = now();
        $plans = [
            'free' => [
                'name' => 'Free',
                'monthly_price' => 0,
                'commission_rate' => 15,
                'features' => ['All 6 product types', 'Unlimited products & students', 'Store link + webapp website', 'Coupons, add-ons, referrals & AutoDM', 'Razorpay checkout (UPI, cards, netbanking)', 'Payouts to your bank'],
            ],
            'pro' => [
                'name' => 'Pro',
                'monthly_price' => 499,
                'commission_rate' => 10,
                'features' => ['Everything in Free', 'Only 10% commission per sale', 'Pays for itself above ~₹10,000 sales/month', 'First 90 days free on signup'],
            ],
        ];

        foreach ($plans as $slug => $plan) {
            DB::table('subscription_plans')->updateOrInsert(
                ['slug' => $slug],
                ['features' => json_encode($plan['features']), 'is_active' => true, 'updated_at' => $now] + $plan,
            );
        }

        DB::table('subscription_plans')->whereNotIn('slug', array_keys($plans))->update(['is_active' => false, 'updated_at' => $now]);
    }

    public function down(): void
    {
        // plans pe subscriptions ka FK hai — delete nahi, sirf band
        DB::table('subscription_plans')->whereIn('slug', ['free', 'pro'])->update(['is_active' => false]);
    }
};
