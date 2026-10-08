<?php

namespace Tests\Feature;

use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\BillingService;
use App\Support\MailPreviews;
use App\Support\PlanPricing;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Brand "CreatorPro" ke saath paid plan ka naam "Plus" — andar (slug / enum) se bahar (emails) tak. */
class PlanNameTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_paid_plan_is_plus_and_pro_no_longer_exists(): void
    {
        $this->assertSame(['free', 'plus'], SubscriptionPlan::where('is_active', true)->orderBy('monthly_price')->pluck('slug')->all());
        $this->assertSame('Plus', app(BillingService::class)->plan()->name);
        $this->assertFalse(SubscriptionPlan::where('slug', 'pro')->exists());
    }

    public function test_users_cannot_be_put_on_the_old_pro_value(): void
    {
        $this->expectException(QueryException::class);

        User::factory()->createOne(['role' => 'creator', 'username' => 'old', 'plan' => 'pro']);
    }

    public function test_new_creators_start_on_a_plus_trial(): void
    {
        $this->assertSame('plus', PlanPricing::trialAttributes()['plan']);
    }

    public function test_plan_emails_say_plus(): void
    {
        $all = MailPreviews::all();

        foreach (['plan-purchased', 'plus-renewed', 'plan-expiring', 'plus-payment-failed'] as $key) {
            $html = (string) ($all[$key]['make'])()->render();

            $this->assertStringContainsString('Plus', $html, $key);
            $this->assertDoesNotMatchRegularExpression('/\bPro\b/', strip_tags($html), "{$key}: old plan name left");
        }
    }
}
