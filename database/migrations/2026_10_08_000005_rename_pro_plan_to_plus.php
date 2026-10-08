<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Brand "CreatorPro" bana — "CreatorPro Pro plan" ajeeb tha, isliye paid plan ka naam ab "Plus".
     * Sirf dikhne wala naam nahi, andar ka slug bhi: users.plan enum aur subscription_plans.slug `pro` → `plus`.
     * Plan ki id wahi rehti hai, isliye subscriptions / plan_purchases / invoices ko kuch nahi karna.
     */
    public function up(): void
    {
        // pehle dono allowed, phir rows badlo, phir purana hatao — beech me koi row invalid nahi hoti
        DB::statement("ALTER TABLE users MODIFY plan ENUM('free','pro','plus') NOT NULL DEFAULT 'free'");
        DB::table('users')->where('plan', 'pro')->update(['plan' => 'plus']);
        DB::statement("ALTER TABLE users MODIFY plan ENUM('free','plus') NOT NULL DEFAULT 'free'");

        DB::table('subscription_plans')->where('slug', 'pro')->update([
            'slug' => 'plus',
            'name' => 'Plus',
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY plan ENUM('free','pro','plus') NOT NULL DEFAULT 'free'");
        DB::table('users')->where('plan', 'plus')->update(['plan' => 'pro']);
        DB::statement("ALTER TABLE users MODIFY plan ENUM('free','pro') NOT NULL DEFAULT 'free'");

        DB::table('subscription_plans')->where('slug', 'plus')->update(['slug' => 'pro', 'name' => 'Pro', 'updated_at' => now()]);
    }
};
