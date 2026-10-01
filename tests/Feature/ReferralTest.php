<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\Referral;
use App\Models\ReferralCredit;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\ReferralService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReferralTest extends TestCase
{
    use RefreshDatabase;

    private ReferralService $referrals;

    private User $referrer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->referrals = app(ReferralService::class);
        $this->referrer = $this->creator('ria');
    }

    private function creator(string $username): User
    {
        return User::factory()->createOne(['role' => 'creator', 'username' => $username, 'plan' => 'free', 'plan_expires_at' => null]);
    }

    private function code(User $user): string
    {
        return $this->referrals->codeFor($user)->code;
    }

    /** Referred creator ki ek sale — order success hote hi observer credit karta hai. */
    private function sale(User $creator, float $amount = 1000): Order
    {
        $product = Product::create([
            'creator_id' => $creator->id, 'type' => 'book', 'title' => 'Guide',
            'slug' => 'guide-' . Product::count(), 'status' => 'published', 'published_at' => now(),
        ]);

        return Order::create([
            'order_number' => 'ORD-' . str_pad((string) (Order::count() + 1), 4, '0', STR_PAD_LEFT),
            'creator_id' => $creator->id,
            'product_id' => $product->id,
            'buyer_phone' => '9876543210',
            'base_amount' => $amount, 'total_amount' => $amount,
            'commission_rate' => 10, 'platform_fee' => $amount * 0.1, 'net_payout_amount' => $amount * 0.9,
            'status' => 'success', 'paid_at' => now(),
        ]);
    }

    // ---------------------------------------------------------------- signup

    public function test_signing_up_with_a_referral_link_records_the_referral(): void
    {
        $this->post('/register', [
            'name' => 'New Creator',
            'email' => 'new@example.com',
            'password' => 'Password!2345',
            'password_confirmation' => 'Password!2345',
            'ref' => $this->code($this->referrer),
        ]);

        $referral = Referral::where('referrer_id', $this->referrer->id)->first();

        $this->assertNotNull($referral);
        $this->assertSame('signed_up', $referral->status);
        $this->assertNull($referral->rewarded_at);
    }

    public function test_self_referral_and_unknown_codes_are_ignored_without_breaking_signup(): void
    {
        $this->referrals->attach($this->referrer, $this->code($this->referrer)); // apna hi code
        $this->assertSame(0, Referral::count());

        $this->post('/register', [
            'name' => 'Someone',
            'email' => 'someone@example.com',
            'password' => 'Password!2345',
            'password_confirmation' => 'Password!2345',
            'ref' => 'NOPE1234',
        ])->assertRedirect();

        $this->assertDatabaseHas('users', ['email' => 'someone@example.com']);
        $this->assertSame(0, Referral::count());
    }

    public function test_a_user_can_only_be_referred_once(): void
    {
        $referred = $this->creator('new1');
        $other = $this->creator('other');

        $this->referrals->attach($referred, $this->code($this->referrer));
        $this->referrals->attach($referred, $this->code($other));

        $this->assertSame(1, Referral::where('referred_user_id', $referred->id)->count());
    }

    // ---------------------------------------------------------------- credit

    public function test_first_sale_credits_the_referrer_exactly_once(): void
    {
        $referred = $this->creator('new2');
        $this->referrals->attach($referred, $this->code($this->referrer));

        $order = $this->sale($referred);

        $this->assertSame(1, ReferralCredit::where('user_id', $this->referrer->id)->where('type', 'earned')->count());
        $this->assertEquals(ReferralService::REWARD, $this->referrals->balanceFor($this->referrer)['balance']);
        $this->assertSame('earning', Referral::where('referred_user_id', $referred->id)->value('status'));

        // dobara success + doosri sale — koi naya credit nahi
        $order->forceFill(['status' => 'pending'])->save();
        $order->forceFill(['status' => 'success'])->save();
        $this->sale($referred, 2500);

        $this->assertSame(1, ReferralCredit::where('user_id', $this->referrer->id)->where('type', 'earned')->count());
    }

    public function test_sale_by_a_creator_nobody_referred_credits_no_one(): void
    {
        $this->sale($this->creator('solo'));

        $this->assertSame(0, ReferralCredit::count());
    }

    // ---------------------------------------------------------------- redeem

    private function fund(int $referrals): void
    {
        foreach (range(1, $referrals) as $i) {
            $referred = $this->creator('ref' . $i);
            $this->referrals->attach($referred, $this->code($this->referrer));
            $this->sale($referred);
        }
    }

    public function test_credit_converts_into_pro_months_and_keeps_the_remainder(): void
    {
        $this->fund(3); // ₹600

        $this->actingAs($this->referrer)
            ->post('/dashboard/refer-earn/redeem', ['months' => 1])
            ->assertSessionHasNoErrors();

        $user = $this->referrer->fresh();
        $this->assertSame('pro', $user->plan);
        $this->assertTrue($user->plan_expires_at->isFuture());
        $this->assertEqualsWithDelta(28, (int) now()->diffInDays($user->plan_expires_at), 4);

        // ₹600 − ₹499 = ₹101 wallet me
        $this->assertEqualsWithDelta(101, $this->referrals->balanceFor($user)['balance'], 0.01);
    }

    public function test_redeeming_while_already_on_pro_extends_the_existing_expiry(): void
    {
        $this->fund(3);
        $this->referrer->forceFill(['plan' => 'pro', 'plan_expires_at' => now()->addDays(60)])->save();

        $this->referrals->redeem($this->referrer->fresh(), 1);

        // 60 din ke BAAD se mahina juda, abhi se nahi
        $this->assertEqualsWithDelta(90, (int) now()->diffInDays($this->referrer->fresh()->plan_expires_at), 4);
    }

    public function test_redeem_is_rejected_without_enough_credit(): void
    {
        $this->fund(1); // sirf ₹200

        $this->actingAs($this->referrer)
            ->post('/dashboard/refer-earn/redeem', ['months' => 1])
            ->assertSessionHasErrors('months');

        $this->assertSame('free', $this->referrer->fresh()->plan);
    }

    public function test_paid_subscribers_cannot_redeem_but_keep_their_credit(): void
    {
        $this->fund(3);

        $plan = SubscriptionPlan::where('slug', 'pro')->first();
        Subscription::create(['user_id' => $this->referrer->id, 'plan_id' => $plan->id, 'status' => 'active', 'gateway' => 'razorpay']);
        $this->referrer->forceFill(['plan' => 'pro', 'plan_expires_at' => null])->save();

        $this->actingAs($this->referrer)
            ->post('/dashboard/refer-earn/redeem', ['months' => 1])
            ->assertSessionHasErrors('months');

        $this->assertEquals(600, $this->referrals->balanceFor($this->referrer->fresh())['balance']);
    }

    // ---------------------------------------------------------------- page

    public function test_page_shows_the_link_balance_and_referrals(): void
    {
        $this->fund(1);

        $this->actingAs($this->referrer)->get('/dashboard/refer-earn')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Referral/Index')
            ->where('reward', ReferralService::REWARD)
            ->where('balance.balance', 200)
            ->where('balance.months_available', 0)
            ->has('referrals', 1)
            ->where('referrals.0.status', 'earning')
            ->has('link')
        );
    }

    public function test_sub_admins_cannot_open_or_redeem_referrals(): void
    {
        $member = User::factory()->createOne([
            'role' => 'sub_admin',
            'parent_creator_id' => $this->referrer->id,
            'username' => 'helper',
        ]);

        $this->actingAs($member)->get('/dashboard/refer-earn')->assertForbidden();
        $this->actingAs($member)->post('/dashboard/refer-earn/redeem', ['months' => 1])->assertForbidden();
    }
}
