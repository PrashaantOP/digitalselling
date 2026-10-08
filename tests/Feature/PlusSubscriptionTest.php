<?php

namespace Tests\Feature;

use App\Mail\PlusPaymentFailedMail;
use App\Mail\PlusRenewedMail;
use App\Models\BillingInvoice;
use App\Models\PayoutProfile;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Plus plan — monthly ₹499, auto-renew (Razorpay Subscriptions). Razorpay hamesha nakli (Http::fake),
 * asli API ko koi call nahi jaati.
 */
class PlusSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'test_secret';

    private const WEBHOOK_SECRET = 'whsec_test';

    private User $creator;

    private int $created = 0;

    /** fake Razorpay ka "GET /subscriptions/{id}" yahi lautata hai */
    private array $remoteSubscription = ['status' => 'authenticated', 'paid_count' => 0];

    /** payment id => entity */
    private array $remotePayments = [];

    private bool $cancelFails = false;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.razorpay.key_id' => 'rzp_test_key',
            'services.razorpay.key_secret' => self::SECRET,
            'services.razorpay.webhook_secret' => self::WEBHOOK_SECRET,
            'services.razorpay.plus_plan_id' => 'plan_T1',
            'billing.seller.gstin' => '10ABCDE1234F1Z5', // 10 = Bihar
            'billing.seller.state' => 'Bihar',
            'inertia.ssr.enabled' => false,
        ]);

        Mail::fake();
        Http::fake(['api.razorpay.com/*' => fn (HttpRequest $request) => $this->razorpay($request)]);
        Http::preventStrayRequests();

        $this->creator = User::factory()->createOne(['role' => 'creator', 'username' => 'ria', 'plan' => 'free', 'plan_expires_at' => null]);
        PayoutProfile::create(['user_id' => $this->creator->id, 'full_name' => 'Ria Sharma', 'state' => 'Bihar']);
    }

    private function razorpay(HttpRequest $request)
    {
        $path = (string) parse_url($request->url(), PHP_URL_PATH);

        if ($path === '/v1/subscriptions') {
            return Http::response(['id' => 'sub_T' . (++$this->created), 'status' => 'created']);
        }

        if (preg_match('#^/v1/subscriptions/([^/]+)/cancel$#', $path, $m)) {
            return $this->cancelFails
                ? Http::response(['error' => ['description' => 'Gateway timeout']], 502)
                : Http::response(['id' => $m[1], 'status' => 'cancelled']);
        }

        if (preg_match('#^/v1/subscriptions/([^/]+)$#', $path, $m)) {
            return Http::response(['id' => $m[1]] + $this->remoteSubscription);
        }

        if (preg_match('#^/v1/payments/([^/]+)$#', $path, $m) && isset($this->remotePayments[$m[1]])) {
            return Http::response($this->remotePayments[$m[1]]);
        }

        if ($path === '/v1/plans') {
            return Http::response(['id' => 'plan_new', 'period' => 'monthly']);
        }

        return Http::response(['error' => ['description' => "Not faked: {$path}"]], 404);
    }

    private function subscribe(array $body = [])
    {
        return $this->actingAs($this->creator)->postJson('/dashboard/settings/billing/subscribe', $body);
    }

    private function verify(string $subscriptionId = 'sub_T1', string $paymentId = 'pay_1', ?string $signature = null)
    {
        return $this->actingAs($this->creator)->postJson('/dashboard/settings/billing/verify', [
            'razorpay_subscription_id' => $subscriptionId,
            'razorpay_payment_id' => $paymentId,
            'razorpay_signature' => $signature ?? hash_hmac('sha256', "{$paymentId}|{$subscriptionId}", self::SECRET),
        ]);
    }

    /** Pehle se chalu subscription (checkout ho chuka). */
    private function live(string $status = 'active', array $attrs = []): Subscription
    {
        return Subscription::create($attrs + [
            'user_id' => $this->creator->id,
            'plan_id' => SubscriptionPlan::where('slug', 'plus')->value('id'),
            'status' => $status,
            'gateway' => 'razorpay',
            'gateway_subscription_id' => 'sub_LIVE',
        ]);
    }

    private function webhook(string $event, array $subscription, array $payment = [], ?string $eventId = null)
    {
        $body = json_encode(['event' => $event, 'payload' => array_filter([
            'subscription' => ['entity' => $subscription + ['id' => 'sub_LIVE']],
            'payment' => $payment ? ['entity' => $payment] : null,
        ])]);

        return $this->call('POST', '/webhooks/razorpay', [], [], [], array_filter([
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_RAZORPAY_SIGNATURE' => hash_hmac('sha256', $body, self::WEBHOOK_SECRET),
            'HTTP_X_RAZORPAY_EVENT_ID' => $eventId,
        ]), $body);
    }

    private function cycle(int $startDaysFromNow, int $endDaysFromNow, string $status = 'active'): array
    {
        return ['status' => $status, 'current_start' => now()->addDays($startDaysFromNow)->getTimestamp(), 'current_end' => now()->addDays($endDaysFromNow)->getTimestamp(), 'paid_count' => 1];
    }

    // ---------------------------------------------------------------- subscribe

    public function test_subscribe_creates_a_razorpay_subscription_for_the_checkout(): void
    {
        $this->subscribe()->assertCreated()->assertJson(['paid' => false, 'key' => 'rzp_test_key', 'subscription_id' => 'sub_T1']);

        Http::assertSent(fn ($r) => str_ends_with($r->url(), '/v1/subscriptions') && $r['plan_id'] === 'plan_T1' && $r['total_count'] === 120
            && $r['customer_notify'] === 1 && $r['notes']['user'] === $this->creator->uuid && ! isset($r['start_at']));
        $this->assertDatabaseHas('subscriptions', ['user_id' => $this->creator->id, 'status' => 'created', 'gateway_subscription_id' => 'sub_T1']);
        $this->assertSame('free', $this->creator->fresh()->plan); // mandate se pehle kuch nahi
    }

    public function test_during_the_trial_the_first_charge_waits_for_the_trial_to_end(): void
    {
        $trialEnd = now()->addDays(40)->startOfSecond();
        $this->creator->forceFill(['plan' => 'plus', 'plan_expires_at' => $trialEnd])->save();

        $this->actingAs($this->creator)->get('/dashboard/settings/billing')->assertInertia(fn (Assert $page) => $page->whereNot('price.first_charge_at', null));
        $this->subscribe()->assertCreated();

        Http::assertSent(fn ($r) => str_ends_with($r->url(), '/v1/subscriptions') && $r['start_at'] === $trialEnd->getTimestamp());
    }

    public function test_state_is_required_before_the_first_subscription_and_is_remembered(): void
    {
        $this->creator->payoutProfile->delete();
        $this->creator = $this->creator->fresh();

        $this->subscribe()->assertUnprocessable()->assertJsonValidationErrors('state');
        $this->subscribe(['state' => 'Kerala'])->assertCreated();

        $this->assertDatabaseHas('payout_profiles', ['user_id' => $this->creator->id, 'state' => 'Kerala']);
    }

    public function test_permanent_plus_cannot_subscribe(): void
    {
        $this->creator->forceFill(['plan' => 'plus', 'plan_expires_at' => null])->save();

        $this->subscribe()->assertUnprocessable()->assertJsonValidationErrors('plan');
        Http::assertNothingSent();
    }

    public function test_it_explains_itself_when_the_razorpay_plan_is_not_set_up(): void
    {
        config(['services.razorpay.plus_plan_id' => null]);

        $this->subscribe()->assertUnprocessable()->assertJsonValidationErrors('plan');
        $this->assertSame(0, Subscription::count());
    }

    public function test_a_second_subscription_is_refused_while_auto_renew_is_on(): void
    {
        $this->live();

        $this->subscribe()->assertUnprocessable()->assertJsonValidationErrors('plan');
        Http::assertNothingSent();
    }

    public function test_a_stopped_subscription_is_replaced_by_a_new_one(): void
    {
        $old = $this->live('halted');

        $this->subscribe()->assertCreated()->assertJson(['subscription_id' => 'sub_T1']);

        Http::assertSent(fn ($r) => str_ends_with($r->url(), '/subscriptions/sub_LIVE/cancel') && $r['cancel_at_cycle_end'] === 0);
        $this->assertSame('cancelled', $old->fresh()->status);
    }

    // ---------------------------------------------------------------- verify

    public function test_verify_with_the_first_charge_activates_plus_and_issues_a_gst_invoice(): void
    {
        $this->subscribe();
        $this->remoteSubscription = $this->cycle(0, 30);
        $this->remotePayments['pay_1'] = ['id' => 'pay_1', 'amount' => 49900, 'status' => 'captured', 'created_at' => now()->getTimestamp()];

        $this->verify()->assertOk()->assertJson(['paid' => true, 'message' => 'Payment received — Plus is active and renews every month.']);

        $user = $this->creator->fresh();
        $this->assertSame('plus', $user->plan);
        $this->assertEqualsWithDelta(31, (int) round(now()->diffInDays($user->plan_expires_at)), 1); // 30 din + 1 din grace

        $invoice = BillingInvoice::sole();
        $this->assertSame('499.00', $invoice->amount);
        $this->assertSame('422.88', $invoice->taxable_amount);
        $this->assertSame('38.06', $invoice->cgst_amount);
        $this->assertSame('pay_1', $invoice->gateway_payment_id);
        $this->assertSame(Subscription::first()->id, $invoice->subscription_id);
        $this->assertSame('Plus plan — monthly (auto-renew)', $invoice->description);
        $this->assertSame('active', Subscription::first()->status);
        Mail::assertSent(PlusRenewedMail::class, fn ($m) => $m->hasTo($this->creator->email) && $m->first);

        // wahi charge webhook se bhi aaye — dobara kuch nahi
        $this->webhook('subscription.charged', ['id' => 'sub_T1'] + $this->cycle(0, 30), ['id' => 'pay_1', 'amount' => 49900])->assertOk();
        $this->assertSame(1, BillingInvoice::count());
        Mail::assertSent(PlusRenewedMail::class, 1);
    }

    public function test_verify_during_the_trial_only_turns_on_auto_renew(): void
    {
        $trialEnd = now()->addDays(40)->startOfSecond();
        $this->creator->forceFill(['plan' => 'plus', 'plan_expires_at' => $trialEnd])->save();
        $this->subscribe();
        $this->remoteSubscription = ['status' => 'authenticated', 'paid_count' => 0];

        $this->verify()->assertOk()->assertJson(['message' => 'Auto-renew is on. Your first payment is taken when your current Plus period ends.']);

        $this->assertSame('authenticated', Subscription::first()->status);
        $this->assertTrue($trialEnd->equalTo($this->creator->fresh()->plan_expires_at));
        $this->assertSame(0, BillingInvoice::count());

        $this->actingAs($this->creator)->get('/dashboard/settings/billing')->assertInertia(fn (Assert $page) => $page
            ->where('subscription.renews', true)
            ->where('subscription.status', 'authenticated')
            ->whereNot('subscription.next_charge_at', null)
        );
    }

    public function test_a_forged_signature_changes_nothing(): void
    {
        $this->subscribe();

        $this->verify(signature: 'forged')->assertUnprocessable()->assertJsonValidationErrors('payment');

        $this->assertSame('created', Subscription::first()->status);
        $this->assertSame('free', $this->creator->fresh()->plan);
    }

    public function test_another_creator_cannot_verify_someone_elses_subscription(): void
    {
        $this->subscribe();
        $other = User::factory()->createOne(['role' => 'creator', 'username' => 'other']);

        $this->actingAs($other)->postJson('/dashboard/settings/billing/verify', [
            'razorpay_subscription_id' => 'sub_T1',
            'razorpay_payment_id' => 'pay_1',
            'razorpay_signature' => hash_hmac('sha256', 'pay_1|sub_T1', self::SECRET),
        ])->assertNotFound();
    }

    // ---------------------------------------------------------------- monthly charges (webhook)

    public function test_every_monthly_charge_moves_the_expiry_and_gets_its_own_invoice(): void
    {
        $sub = $this->live();

        $this->webhook('subscription.charged', $this->cycle(0, 30), ['id' => 'pay_m1', 'amount' => 49900], 'evt_1')->assertOk()->assertJson(['status' => 'ok']);
        $this->webhook('subscription.charged', $this->cycle(0, 30), ['id' => 'pay_m1', 'amount' => 49900], 'evt_1')->assertJson(['status' => 'duplicate']);
        $first = $this->creator->fresh()->plan_expires_at;

        $this->webhook('subscription.charged', $this->cycle(30, 61), ['id' => 'pay_m2', 'amount' => 49900], 'evt_2')->assertOk();

        $this->assertSame(2, BillingInvoice::where('subscription_id', $sub->id)->count());
        $this->assertEqualsWithDelta(31, (int) round($first->diffInDays($this->creator->fresh()->plan_expires_at)), 1);
        $this->assertNotNull($sub->fresh()->last_charged_at);
        Mail::assertSent(PlusRenewedMail::class, fn ($m) => ! $m->first);
    }

    public function test_a_charge_never_shortens_plus_that_already_runs_longer(): void
    {
        $credit = now()->addDays(100)->startOfSecond();
        $this->creator->forceFill(['plan' => 'plus', 'plan_expires_at' => $credit])->save();
        $this->live();

        $this->webhook('subscription.charged', $this->cycle(0, 30), ['id' => 'pay_m1', 'amount' => 49900])->assertOk();

        $this->assertTrue($credit->equalTo($this->creator->fresh()->plan_expires_at));
        $this->assertSame(1, BillingInvoice::count());
    }

    public function test_failed_auto_debits_mail_the_creator_once_per_step(): void
    {
        $expiry = now()->addDays(2)->startOfSecond();
        $this->creator->forceFill(['plan' => 'plus', 'plan_expires_at' => $expiry])->save();
        $sub = $this->live();

        $this->webhook('subscription.pending', ['status' => 'pending'], ['id' => 'pay_f1', 'error_description' => 'Insufficient balance'])->assertOk();
        $this->webhook('subscription.pending', ['status' => 'pending'], ['id' => 'pay_f2', 'error_description' => 'Insufficient balance'])->assertOk();

        $this->assertSame('pending', $sub->fresh()->status);
        $this->assertSame('Insufficient balance', $sub->fresh()->failure_reason);
        Mail::assertSent(PlusPaymentFailedMail::class, 1);
        Mail::assertSent(PlusPaymentFailedMail::class, fn ($m) => ! $m->halted);

        $this->webhook('subscription.halted', ['status' => 'halted'])->assertOk();

        $this->assertSame('halted', $sub->fresh()->status);
        Mail::assertSent(PlusPaymentFailedMail::class, fn ($m) => $m->halted);
        // Plus jitna paid tha utna hi chalta hai — beech me nahi kat-ta
        $this->assertTrue($expiry->equalTo($this->creator->fresh()->plan_expires_at));
        $this->actingAs($this->creator)->get('/dashboard/settings/billing')->assertInertia(fn (Assert $page) => $page
            ->where('subscription.status', 'halted')->where('subscription.renews', false));
    }

    public function test_webhooks_arriving_out_of_order_never_move_the_status_backwards(): void
    {
        $sub = $this->live();

        $this->webhook('subscription.authenticated', ['status' => 'authenticated'])->assertOk();
        $this->assertSame('active', $sub->fresh()->status);

        $this->webhook('subscription.cancelled', ['status' => 'cancelled'])->assertOk();
        $this->webhook('subscription.activated', ['status' => 'active'])->assertOk();
        $this->assertSame('cancelled', $sub->fresh()->status);
        $this->assertNotNull($sub->fresh()->cancelled_at);
    }

    public function test_unknown_subscriptions_are_acknowledged(): void
    {
        $this->webhook('subscription.charged', ['id' => 'sub_elsewhere', 'status' => 'active'], ['id' => 'pay_z', 'amount' => 49900])
            ->assertOk()->assertJson(['status' => 'unknown_subscription']);

        $this->assertSame(0, BillingInvoice::count());
    }

    // ---------------------------------------------------------------- cancel

    public function test_cancelling_keeps_plus_until_the_paid_month_ends(): void
    {
        $expiry = now()->addDays(20)->startOfSecond();
        $this->creator->forceFill(['plan' => 'plus', 'plan_expires_at' => $expiry])->save();
        $sub = $this->live('active', ['current_period_end' => now()->addDays(19)]);

        $this->actingAs($this->creator)->post('/dashboard/settings/billing/cancel')->assertRedirect()->assertSessionHasNoErrors();

        Http::assertSent(fn ($r) => str_ends_with($r->url(), '/subscriptions/sub_LIVE/cancel') && $r['cancel_at_cycle_end'] === 1);
        $sub->refresh();
        $this->assertSame('active', $sub->status);
        $this->assertTrue($sub->cancel_at_period_end);
        $this->assertFalse($sub->renews());
        $this->assertTrue($expiry->equalTo($this->creator->fresh()->plan_expires_at));

        // period khatam — Razorpay batata hai
        $this->webhook('subscription.cancelled', ['status' => 'cancelled'])->assertOk();
        $this->assertSame('cancelled', $sub->fresh()->status);
    }

    public function test_cancelling_before_the_first_charge_stops_it_right_away(): void
    {
        $sub = $this->live('authenticated');

        $this->actingAs($this->creator)->post('/dashboard/settings/billing/cancel')->assertSessionHasNoErrors();

        Http::assertSent(fn ($r) => str_ends_with($r->url(), '/cancel') && $r['cancel_at_cycle_end'] === 0);
        $this->assertSame('cancelled', $sub->fresh()->status);
    }

    public function test_if_razorpay_cannot_cancel_auto_renew_stays_on(): void
    {
        $sub = $this->live();
        $this->cancelFails = true;

        $this->actingAs($this->creator)->post('/dashboard/settings/billing/cancel')->assertSessionHasErrors('plan');

        $this->assertTrue($sub->fresh()->renews());
    }

    // ---------------------------------------------------------------- page + command

    public function test_billing_page_shows_the_next_charge_while_auto_renew_is_on(): void
    {
        $this->live('active', ['current_period_end' => now()->addDays(12)]);

        $this->actingAs($this->creator)->get('/dashboard/settings/billing')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('settings/billing')
            ->where('subscription.status', 'active')
            ->where('subscription.renews', true)
            ->whereNot('subscription.next_charge_at', null)
        );
    }

    public function test_admin_billing_lists_subscriptions(): void
    {
        $admin = new \App\Models\Admin(['name' => 'Ops', 'email' => 'ops@platform.test']);
        $admin->forceFill(['password' => 'Sup3r$ecretPass', 'is_active' => true])->save();
        $this->live('pending', ['failure_reason' => 'Card expired']);

        $this->actingAs($admin, 'admin')->get('/admin/billing')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('subscriptions.data', 1)
            ->where('subscriptions.data.0.status', 'pending')
            ->where('subscriptions.data.0.failure_reason', 'Card expired')
            ->where('totals.failing', 1)
        );
    }

    public function test_the_plan_command_creates_the_monthly_razorpay_plan(): void
    {
        config(['services.razorpay.plus_plan_id' => null]);

        $this->artisan('billing:razorpay-plan')->expectsOutputToContain('RAZORPAY_PLUS_PLAN_ID=plan_new')->assertSuccessful();

        Http::assertSent(fn ($r) => str_ends_with($r->url(), '/v1/plans') && $r['period'] === 'monthly' && $r['interval'] === 1 && $r['item']['amount'] === 49900);
    }
}
