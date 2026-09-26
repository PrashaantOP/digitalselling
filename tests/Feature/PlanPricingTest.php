<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\PlanPricing;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlanPricingTest extends TestCase
{
    use RefreshDatabase;

    public function test_migration_seeds_free_and_pro_plans()
    {
        $this->assertDatabaseHas('subscription_plans', ['slug' => 'free', 'monthly_price' => 0, 'commission_rate' => 15, 'is_active' => true]);
        $this->assertDatabaseHas('subscription_plans', ['slug' => 'pro', 'monthly_price' => 499, 'commission_rate' => 10, 'is_active' => true]);
    }

    public function test_active_trial_is_pro_at_ten_percent()
    {
        $user = User::factory()->createOne(PlanPricing::trialAttributes());

        $this->assertSame('pro', PlanPricing::effectivePlan($user));
        $this->assertSame(10.0, PlanPricing::commissionRate($user));
    }

    public function test_expired_trial_is_free_at_fifteen_percent_even_before_the_cron_runs()
    {
        $user = User::factory()->createOne(['plan' => 'pro', 'plan_expires_at' => now()->subMinute()]);

        $this->assertSame('free', PlanPricing::effectivePlan($user));
        $this->assertSame(15.0, PlanPricing::commissionRate($user));
        $this->assertFalse($user->onPro());
    }

    public function test_paid_pro_without_expiry_stays_pro()
    {
        $user = User::factory()->createOne(['plan' => 'pro', 'plan_expires_at' => null]);

        $this->assertTrue($user->onPro());
    }

    public function test_expire_command_downgrades_only_ended_trials()
    {
        $ended = User::factory()->createOne(['plan' => 'pro', 'plan_expires_at' => now()->subDay()]);
        $running = User::factory()->createOne(['plan' => 'pro', 'plan_expires_at' => now()->addDays(10)]);
        $paid = User::factory()->createOne(['plan' => 'pro', 'plan_expires_at' => null]);

        $this->artisan('plans:expire')->assertSuccessful();

        $this->assertSame('free', $ended->fresh()->plan);
        $this->assertNull($ended->fresh()->plan_expires_at);
        $this->assertSame('pro', $running->fresh()->plan);
        $this->assertSame('pro', $paid->fresh()->plan);
    }
}
