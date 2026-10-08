<?php

namespace Tests\Feature;

use App\Mail\PlanExpiringMail;
use App\Mail\PlanPurchasedMail;
use App\Models\BillingInvoice;
use App\Models\KycVerification;
use App\Models\PayoutProfile;
use App\Models\PlanPurchase;
use App\Models\ReferralCredit;
use App\Models\Subscription;
use App\Models\User;
use App\Services\BillingService;
use App\Support\InvoiceNumber;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Plus billing ka hisaab: GST, invoices, referral credit, reminders, aur purani PREPAID kharid (PlanPurchase) —
 * naya checkout auto-renew hai (PlusSubscriptionTest), par beech me atki prepaid kharid webhook se ab bhi poori hoti hai.
 * Razorpay hamesha Http::fake() se, asli API ko koi call nahi jaati.
 */
class BillingTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'test_secret';

    private const WEBHOOK_SECRET = 'whsec_test';

    private BillingService $billing;

    private User $creator;

    private int $orders = 0;

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
        ]);

        Mail::fake();
        Http::fake(['api.razorpay.com/v1/orders' => fn () => Http::response(['id' => 'order_T' . (++$this->orders), 'status' => 'created'])]);
        config(['inertia.ssr.enabled' => false]); // SSR ka localhost call stray request na bane
        Http::preventStrayRequests();

        $this->billing = app(BillingService::class);
        $this->creator = User::factory()->createOne(['role' => 'creator', 'username' => 'ria', 'plan' => 'free', 'plan_expires_at' => null]);
        PayoutProfile::create(['user_id' => $this->creator->id, 'full_name' => 'Ria Sharma', 'state' => 'Bihar']);
    }

    private function fund(float $amount): void
    {
        ReferralCredit::create(['user_id' => $this->creator->id, 'type' => 'earned', 'amount' => $amount, 'description' => 'Test credit']);
    }

    /** Purani prepaid kharid shuru (ab sirf service se — UI auto-renew hai). */
    private function purchase(int $months = 1, bool $useCredit = false): PlanPurchase
    {
        return $this->billing->start($this->creator->fresh(), $months, $useCredit);
    }

    private function webhook(string $event, string $orderId, int $paise, string $paymentId = 'pay_1')
    {
        $body = json_encode(['event' => $event, 'payload' => ['payment' => ['entity' => ['id' => $paymentId, 'order_id' => $orderId, 'amount' => $paise]]]]);

        return $this->call('POST', '/webhooks/razorpay', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_RAZORPAY_SIGNATURE' => hash_hmac('sha256', $body, self::WEBHOOK_SECRET),
        ], $body);
    }

    // ---------------------------------------------------------------- quote / GST

    public function test_price_is_gst_inclusive_and_splits_into_cgst_and_sgst_within_the_state(): void
    {
        $quote = $this->billing->quote($this->creator, 1);

        $this->assertSame(499.0, $quote['payable']);
        $this->assertSame(422.88, $quote['taxable']);
        $this->assertSame(76.12, $quote['gst']);
        $this->assertSame(38.06, $quote['cgst']);
        $this->assertSame(38.06, $quote['sgst']);
        $this->assertSame(0.0, $quote['igst']);
    }

    public function test_another_state_is_charged_igst(): void
    {
        $this->creator->payoutProfile->update(['state' => 'Maharashtra']);

        $quote = $this->billing->quote($this->creator->fresh(), 1);

        $this->assertSame(76.12, $quote['igst']);
        $this->assertSame(0.0, $quote['cgst']);
    }

    public function test_verified_gstin_decides_the_state_over_the_profile(): void
    {
        KycVerification::create(['user_id' => $this->creator->id, 'legal_name' => 'Ria', 'pan_number' => 'ABCDE1234F', 'gst_number' => '27ABCDE1234F1Z5', 'status' => 'verified']);

        $profile = $this->billing->billingProfile($this->creator->fresh());

        $this->assertSame('Maharashtra', $profile['state']);
        $this->assertSame('27ABCDE1234F1Z5', $profile['gstin']);
    }

    // ---------------------------------------------------------------- prepaid kharid (purani) — webhook se poori

    public function test_a_prepaid_purchase_is_pending_until_razorpay_confirms_it(): void
    {
        $purchase = $this->purchase(3);

        $this->assertDatabaseHas('plan_purchases', ['id' => $purchase->id, 'months' => 3, 'amount_payable' => 1497, 'status' => 'pending', 'gateway_order_id' => 'order_T1']);
        $this->assertSame('free', $this->creator->fresh()->plan);
    }

    public function test_webhook_activates_plus_and_issues_a_tax_invoice(): void
    {
        $this->purchase(1);

        $this->webhook('payment.captured', 'order_T1', 49900)->assertOk()->assertJson(['status' => 'ok']);

        $user = $this->creator->fresh();
        $this->assertSame('plus', $user->plan);
        $this->assertEqualsWithDelta(30, (int) now()->diffInDays($user->plan_expires_at), 2);
        $this->assertSame('pay_1', PlanPurchase::first()->gateway_payment_id);

        $invoice = BillingInvoice::firstOrFail();
        $this->assertSame('INV-' . InvoiceNumber::financialYear() . '-000001', $invoice->invoice_number);
        $this->assertSame('499.00', $invoice->amount);
        $this->assertSame('422.88', $invoice->taxable_amount);
        $this->assertSame('38.06', $invoice->cgst_amount);
        $this->assertSame('Ria Sharma', $invoice->billing_name);
        $this->assertSame('10ABCDE1234F1Z5', $invoice->seller['gstin']);
        $this->assertSame('pay_1', $invoice->gateway_payment_id);

        Mail::assertSent(PlanPurchasedMail::class, fn ($mail) => $mail->hasTo($this->creator->email));
    }

    public function test_the_same_payment_twice_gives_the_months_only_once(): void
    {
        $this->purchase(1);

        $this->webhook('payment.captured', 'order_T1', 49900)->assertOk();
        $expiry = $this->creator->fresh()->plan_expires_at;
        $this->webhook('order.paid', 'order_T1', 49900)->assertOk();

        $this->assertTrue($expiry->equalTo($this->creator->fresh()->plan_expires_at));
        $this->assertSame(1, BillingInvoice::count());
        Mail::assertSent(PlanPurchasedMail::class, 1);
    }

    public function test_webhook_with_a_different_amount_is_not_fulfilled(): void
    {
        $this->purchase(1);

        $this->webhook('payment.captured', 'order_T1', 100)->assertOk()->assertJson(['status' => 'amount_mismatch']);

        $this->assertSame('free', $this->creator->fresh()->plan);
    }

    public function test_webhook_with_a_bad_signature_is_refused(): void
    {
        $this->postJson('/webhooks/razorpay', ['event' => 'payment.captured'], ['X-Razorpay-Signature' => 'nope'])->assertStatus(400);
    }

    public function test_the_old_prepaid_checkout_route_is_gone(): void
    {
        $this->actingAs($this->creator)->postJson('/dashboard/settings/billing/checkout', ['months' => 1])->assertNotFound();
    }

    // ---------------------------------------------------------------- expiry maths

    public function test_buying_during_the_trial_adds_months_after_the_trial_ends(): void
    {
        $this->creator->forceFill(['plan' => 'plus', 'plan_expires_at' => now()->addDays(40)])->save();

        $this->purchase(1);
        $this->webhook('payment.captured', 'order_T1', 49900)->assertOk();

        // 40 din ka trial + 1 mahina — trial ke din zaya nahi hue
        $this->assertEqualsWithDelta(70, (int) now()->diffInDays($this->creator->fresh()->plan_expires_at), 3);
    }

    public function test_an_expired_plan_restarts_from_today(): void
    {
        $this->creator->forceFill(['plan' => 'plus', 'plan_expires_at' => now()->subDays(20)])->save();

        $this->purchase(1);
        $this->webhook('payment.captured', 'order_T1', 49900)->assertOk();

        $this->assertEqualsWithDelta(30, (int) now()->diffInDays($this->creator->fresh()->plan_expires_at), 2);
    }

    public function test_permanent_plus_cannot_buy_more_months(): void
    {
        $this->creator->forceFill(['plan' => 'plus', 'plan_expires_at' => null])->save();

        $this->expectException(ValidationException::class);

        try {
            $this->purchase(1);
        } finally {
            $this->assertSame(0, PlanPurchase::count());
        }
    }

    // ---------------------------------------------------------------- referral credit

    public function test_referral_credit_reduces_what_is_charged_and_is_only_spent_on_payment(): void
    {
        $this->fund(200);

        $purchase = $this->purchase(1, true);
        $this->assertSame('299.00', $purchase->amount_payable);

        // payment se pehle credit jyon ka tyon — checkout chhod de to kuch nahi kata
        $this->assertSame(0, ReferralCredit::where('type', 'redeemed')->count());

        $this->webhook('payment.captured', 'order_T1', 29900)->assertOk();

        $this->assertEquals(200, ReferralCredit::where('type', 'redeemed')->sum('amount'));
        $invoice = BillingInvoice::firstOrFail();
        $this->assertSame('299.00', $invoice->amount);
        $this->assertSame('200.00', $invoice->credit_applied);
    }

    public function test_full_credit_activates_plus_without_touching_the_gateway(): void
    {
        $this->fund(600);

        $this->assertSame('paid', $this->purchase(1, true)->status);

        Http::assertNothingSent();
        $this->assertSame('plus', $this->creator->fresh()->plan);
        $this->assertSame('credit', PlanPurchase::first()->gateway);
        $this->assertSame(0, BillingInvoice::count()); // paisa nahi aaya — tax invoice nahi
        $this->assertEqualsWithDelta(101, 600 - (float) ReferralCredit::where('type', 'redeemed')->sum('amount'), 0.01);
    }

    public function test_referral_credit_cannot_be_redeemed_while_auto_renew_is_on(): void
    {
        $this->fund(600);
        Subscription::create(['user_id' => $this->creator->id, 'plan_id' => $this->billing->plan()->id, 'status' => 'active', 'gateway' => 'razorpay', 'gateway_subscription_id' => 'sub_X']);

        $this->actingAs($this->creator)->post('/dashboard/refer-earn/redeem', ['months' => 1])->assertSessionHasErrors('months');
        $this->assertSame(0, ReferralCredit::where('type', 'redeemed')->count());

        // auto-renew band (mahine ke ant tak chalega) — ab credit lag sakta hai
        Subscription::query()->update(['cancel_at_period_end' => true]);
        $this->actingAs($this->creator)->post('/dashboard/refer-earn/redeem', ['months' => 1])->assertSessionHasNoErrors();
        $this->assertSame(1, ReferralCredit::where('type', 'redeemed')->count());
    }

    // ---------------------------------------------------------------- access

    public function test_billing_page_shows_the_monthly_price_and_invoices(): void
    {
        $this->actingAs($this->creator)->get('/dashboard/settings/billing')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('settings/billing')
            ->where('plan.effective', 'free')
            ->where('plus.monthly_price', 499)
            ->where('price.amount', 499)
            ->where('price.gst', 76.12)
            ->where('price.first_charge_at', null)
            ->where('subscription', null)
            ->where('billing.state', 'Bihar')
            ->where('paymentsReady', true)
            ->has('invoices', 0)
        );
    }

    public function test_payments_are_not_ready_without_the_razorpay_plan_id(): void
    {
        config(['services.razorpay.plus_plan_id' => null]);

        $this->actingAs($this->creator)->get('/dashboard/settings/billing')->assertInertia(fn (Assert $page) => $page->where('paymentsReady', false));
    }

    public function test_invoice_opens_for_its_owner_only_and_never_by_numeric_id(): void
    {
        $this->purchase(1);
        $this->webhook('payment.captured', 'order_T1', 49900);
        $invoice = BillingInvoice::firstOrFail();
        $other = User::factory()->createOne(['role' => 'creator', 'username' => 'other']);

        $this->actingAs($this->creator)->get("/dashboard/settings/billing/invoices/{$invoice->uuid}")->assertOk()->assertSee($invoice->invoice_number)->assertSee('Tax Invoice');
        $this->actingAs($this->creator)->get("/dashboard/settings/billing/invoices/{$invoice->id}")->assertNotFound();
        $this->actingAs($other)->get("/dashboard/settings/billing/invoices/{$invoice->uuid}")->assertNotFound();
    }

    public function test_sub_admins_cannot_open_billing_or_subscribe(): void
    {
        $member = User::factory()->createOne(['role' => 'sub_admin', 'parent_creator_id' => $this->creator->id, 'username' => 'helper']);

        $this->actingAs($member)->get('/dashboard/settings/billing')->assertForbidden();
        $this->actingAs($member)->postJson('/dashboard/settings/billing/subscribe')->assertForbidden();
        $this->actingAs($member)->postJson('/dashboard/settings/billing/cancel')->assertForbidden();
    }

    // ---------------------------------------------------------------- numbering / commands

    public function test_invoice_numbers_run_in_sequence_within_the_financial_year(): void
    {
        foreach ([1, 2] as $n) {
            $this->purchase(1);
            $this->webhook('payment.captured', "order_T{$n}", 49900, "pay_{$n}")->assertOk();
        }

        $fy = InvoiceNumber::financialYear();
        $this->assertSame(["INV-{$fy}-000001", "INV-{$fy}-000002"], BillingInvoice::orderBy('id')->pluck('invoice_number')->all());

        // April se naya saal
        $this->assertSame('2627', InvoiceNumber::financialYear(Carbon::parse('2026-04-01 10:00', 'Asia/Kolkata')));
        $this->assertSame('2526', InvoiceNumber::financialYear(Carbon::parse('2026-03-31 10:00', 'Asia/Kolkata')));
    }

    public function test_abandoned_checkouts_are_closed_after_the_ttl(): void
    {
        $this->purchase(1);
        PlanPurchase::query()->update(['created_at' => now()->subHour()]);

        $this->artisan('billing:expire-pending')->assertSuccessful();

        $this->assertSame('failed', PlanPurchase::first()->status);
    }

    public function test_reminder_goes_only_to_creators_expiring_on_a_reminder_day_without_auto_renew(): void
    {
        $soon = User::factory()->createOne(['role' => 'creator', 'username' => 'soon', 'plan' => 'plus', 'plan_expires_at' => now('Asia/Kolkata')->addDays(3)->setTime(12, 0)]);
        $later = User::factory()->createOne(['role' => 'creator', 'username' => 'later', 'plan' => 'plus', 'plan_expires_at' => now('Asia/Kolkata')->addDays(5)->setTime(12, 0)]);
        // usi din khatam, par auto-renew chalu — "ends soon" mail galat hoga
        $renewing = User::factory()->createOne(['role' => 'creator', 'username' => 'renews', 'plan' => 'plus', 'plan_expires_at' => now('Asia/Kolkata')->addDays(3)->setTime(12, 0)]);
        Subscription::create(['user_id' => $renewing->id, 'plan_id' => $this->billing->plan()->id, 'status' => 'active', 'gateway' => 'razorpay', 'gateway_subscription_id' => 'sub_R']);

        $this->artisan('billing:remind')->assertSuccessful();

        Mail::assertSent(PlanExpiringMail::class, fn ($mail) => $mail->hasTo($soon->email) && $mail->daysLeft === 3);
        Mail::assertNotSent(PlanExpiringMail::class, fn ($mail) => $mail->hasTo($later->email));
        Mail::assertNotSent(PlanExpiringMail::class, fn ($mail) => $mail->hasTo($renewing->email));
    }
}
