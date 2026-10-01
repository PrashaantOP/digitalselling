<?php

namespace Tests\Feature;

use App\Mail\PlanExpiringMail;
use App\Mail\PlanPurchasedMail;
use App\Models\BillingInvoice;
use App\Models\KycVerification;
use App\Models\PayoutProfile;
use App\Models\PlanPurchase;
use App\Models\ReferralCredit;
use App\Models\User;
use App\Services\BillingService;
use App\Support\InvoiceNumber;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Pro plan ki prepaid billing — Razorpay hamesha Http::fake() se, asli API ko koi call nahi jaati. */
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
            'billing.seller.gstin' => '10ABCDE1234F1Z5', // 10 = Bihar
            'billing.seller.state' => 'Bihar',
        ]);

        Mail::fake();
        Http::fake(['api.razorpay.com/v1/orders' => fn () => Http::response(['id' => 'order_T' . (++$this->orders), 'status' => 'created'])]);

        $this->billing = app(BillingService::class);
        $this->creator = User::factory()->createOne(['role' => 'creator', 'username' => 'ria', 'plan' => 'free', 'plan_expires_at' => null]);
        PayoutProfile::create(['user_id' => $this->creator->id, 'full_name' => 'Ria Sharma', 'state' => 'Bihar']);
    }

    private function fund(float $amount): void
    {
        ReferralCredit::create(['user_id' => $this->creator->id, 'type' => 'earned', 'amount' => $amount, 'description' => 'Test credit']);
    }

    private function checkout(int $months = 1, array $extra = [])
    {
        return $this->actingAs($this->creator)->postJson('/dashboard/settings/billing/checkout', ['months' => $months] + $extra);
    }

    private function verifyPayload(string $orderId, string $paymentId = 'pay_1'): array
    {
        return [
            'razorpay_order_id' => $orderId,
            'razorpay_payment_id' => $paymentId,
            'razorpay_signature' => hash_hmac('sha256', "{$orderId}|{$paymentId}", self::SECRET),
        ];
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

    // ---------------------------------------------------------------- checkout → verify

    public function test_checkout_creates_a_pending_purchase_and_a_gateway_order(): void
    {
        $this->checkout(3)->assertCreated()->assertJson(['paid' => false, 'order_id' => 'order_T1', 'amount' => 149700, 'key' => 'rzp_test_key']);

        $this->assertDatabaseHas('plan_purchases', ['user_id' => $this->creator->id, 'months' => 3, 'amount_payable' => 1497, 'status' => 'pending', 'gateway_order_id' => 'order_T1']);
        $this->assertSame('free', $this->creator->fresh()->plan);
    }

    public function test_valid_payment_signature_activates_pro_and_issues_a_tax_invoice(): void
    {
        $this->checkout(1);

        $this->actingAs($this->creator)->postJson('/dashboard/settings/billing/verify', $this->verifyPayload('order_T1'))->assertOk()->assertJson(['paid' => true]);

        $user = $this->creator->fresh();
        $this->assertSame('pro', $user->plan);
        $this->assertEqualsWithDelta(30, (int) now()->diffInDays($user->plan_expires_at), 2);

        $invoice = BillingInvoice::firstOrFail();
        $this->assertSame('INV-' . InvoiceNumber::financialYear() . '-000001', $invoice->invoice_number);
        $this->assertSame('499.00', $invoice->amount);
        $this->assertSame('422.88', $invoice->taxable_amount);
        $this->assertSame('38.06', $invoice->cgst_amount);
        $this->assertSame('Ria Sharma', $invoice->billing_name);
        $this->assertSame('10ABCDE1234F1Z5', $invoice->seller['gstin']);

        Mail::assertSent(PlanPurchasedMail::class, fn ($mail) => $mail->hasTo($this->creator->email));
    }

    public function test_wrong_signature_is_rejected_and_nothing_changes(): void
    {
        $this->checkout(1);

        $payload = ['razorpay_signature' => 'forged'] + $this->verifyPayload('order_T1');
        $this->actingAs($this->creator)->postJson('/dashboard/settings/billing/verify', $payload)->assertUnprocessable();

        $this->assertSame('free', $this->creator->fresh()->plan);
        $this->assertSame(0, BillingInvoice::count());
    }

    public function test_another_creator_cannot_verify_someone_elses_order(): void
    {
        $this->checkout(1);
        $other = User::factory()->createOne(['role' => 'creator', 'username' => 'other']);

        $this->actingAs($other)->postJson('/dashboard/settings/billing/verify', $this->verifyPayload('order_T1'))->assertNotFound();

        $this->assertSame('free', $this->creator->fresh()->plan);
    }

    public function test_verify_and_webhook_together_give_the_months_only_once(): void
    {
        $this->checkout(1);

        $this->actingAs($this->creator)->postJson('/dashboard/settings/billing/verify', $this->verifyPayload('order_T1'))->assertOk();
        $expiry = $this->creator->fresh()->plan_expires_at;

        $this->webhook('payment.captured', 'order_T1', 49900)->assertOk()->assertJson(['status' => 'ok']);

        $this->assertTrue($expiry->equalTo($this->creator->fresh()->plan_expires_at));
        $this->assertSame(1, BillingInvoice::count());
        Mail::assertSent(PlanPurchasedMail::class, 1);
    }

    // ---------------------------------------------------------------- webhook

    public function test_webhook_alone_activates_pro_when_the_browser_never_came_back(): void
    {
        $this->checkout(1);

        $this->webhook('payment.captured', 'order_T1', 49900)->assertOk();

        $this->assertSame('pro', $this->creator->fresh()->plan);
        $this->assertSame('paid', PlanPurchase::first()->status);
        $this->assertSame('pay_1', PlanPurchase::first()->gateway_payment_id);
    }

    public function test_webhook_with_a_different_amount_is_not_fulfilled(): void
    {
        $this->checkout(1);

        $this->webhook('payment.captured', 'order_T1', 100)->assertOk()->assertJson(['status' => 'amount_mismatch']);

        $this->assertSame('free', $this->creator->fresh()->plan);
    }

    public function test_webhook_with_a_bad_signature_is_refused(): void
    {
        $this->checkout(1);

        $this->postJson('/webhooks/razorpay', ['event' => 'payment.captured'], ['X-Razorpay-Signature' => 'nope'])->assertStatus(400);
    }

    // ---------------------------------------------------------------- expiry maths

    public function test_buying_during_the_trial_adds_months_after_the_trial_ends(): void
    {
        $this->creator->forceFill(['plan' => 'pro', 'plan_expires_at' => now()->addDays(40)])->save();

        $this->checkout(1);
        $this->actingAs($this->creator)->postJson('/dashboard/settings/billing/verify', $this->verifyPayload('order_T1'))->assertOk();

        // 40 din ka trial + 1 mahina — trial ke din zaya nahi hue
        $this->assertEqualsWithDelta(70, (int) now()->diffInDays($this->creator->fresh()->plan_expires_at), 3);
    }

    public function test_an_expired_plan_restarts_from_today(): void
    {
        $this->creator->forceFill(['plan' => 'pro', 'plan_expires_at' => now()->subDays(20)])->save();

        $this->checkout(1);
        $this->actingAs($this->creator)->postJson('/dashboard/settings/billing/verify', $this->verifyPayload('order_T1'))->assertOk();

        $this->assertEqualsWithDelta(30, (int) now()->diffInDays($this->creator->fresh()->plan_expires_at), 2);
    }

    public function test_permanent_pro_cannot_buy_more_months(): void
    {
        $this->creator->forceFill(['plan' => 'pro', 'plan_expires_at' => null])->save();

        $this->checkout(1)->assertUnprocessable()->assertJsonValidationErrors('months');

        $this->assertSame(0, PlanPurchase::count());
    }

    // ---------------------------------------------------------------- referral credit

    public function test_referral_credit_reduces_what_is_charged_and_is_only_spent_on_payment(): void
    {
        $this->fund(200);

        $this->checkout(1, ['use_credit' => true])->assertCreated()->assertJson(['amount' => 29900]);

        // payment se pehle credit jyon ka tyon — checkout chhod de to kuch nahi kata
        $this->assertSame(0, ReferralCredit::where('type', 'redeemed')->count());

        $this->actingAs($this->creator)->postJson('/dashboard/settings/billing/verify', $this->verifyPayload('order_T1'))->assertOk();

        $this->assertEquals(200, ReferralCredit::where('type', 'redeemed')->sum('amount'));
        $invoice = BillingInvoice::firstOrFail();
        $this->assertSame('299.00', $invoice->amount);
        $this->assertSame('200.00', $invoice->credit_applied);
    }

    public function test_full_credit_activates_pro_without_touching_the_gateway(): void
    {
        $this->fund(600);

        $this->checkout(1, ['use_credit' => true])->assertOk()->assertJson(['paid' => true]);

        Http::assertNothingSent();
        $this->assertSame('pro', $this->creator->fresh()->plan);
        $this->assertSame('credit', PlanPurchase::first()->gateway);
        $this->assertSame(0, BillingInvoice::count()); // paisa nahi aaya — tax invoice nahi
        $this->assertEqualsWithDelta(101, 600 - (float) ReferralCredit::where('type', 'redeemed')->sum('amount'), 0.01);
    }

    // ---------------------------------------------------------------- access

    public function test_state_is_required_before_the_first_purchase_and_is_remembered(): void
    {
        $this->creator->payoutProfile->delete();
        $this->creator = $this->creator->fresh();

        $this->checkout(1)->assertUnprocessable()->assertJsonValidationErrors('state');
        $this->checkout(1, ['state' => 'Kerala'])->assertCreated();

        $this->assertDatabaseHas('payout_profiles', ['user_id' => $this->creator->id, 'state' => 'Kerala']);
    }

    public function test_unknown_duration_is_rejected(): void
    {
        $this->checkout(2)->assertUnprocessable()->assertJsonValidationErrors('months');
    }

    public function test_checkout_explains_itself_when_razorpay_keys_are_missing(): void
    {
        config(['services.razorpay.key_id' => null]);

        $this->checkout(1)->assertUnprocessable()->assertJsonValidationErrors('months');
        $this->assertSame(0, PlanPurchase::count());
    }

    public function test_billing_page_shows_plan_quotes_and_invoices(): void
    {
        $this->actingAs($this->creator)->get('/dashboard/settings/billing')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('settings/billing')
            ->where('plan.effective', 'free')
            ->where('pro.monthly_price', 499)
            ->has('quotes', 4)
            ->where('quotes.0.plain.payable', 499)
            ->where('billing.state', 'Bihar')
            ->where('paymentsReady', true)
            ->has('invoices', 0)
        );
    }

    public function test_invoice_opens_for_its_owner_only_and_never_by_numeric_id(): void
    {
        $this->checkout(1);
        $this->actingAs($this->creator)->postJson('/dashboard/settings/billing/verify', $this->verifyPayload('order_T1'));
        $invoice = BillingInvoice::firstOrFail();
        $other = User::factory()->createOne(['role' => 'creator', 'username' => 'other']);

        $this->actingAs($this->creator)->get("/dashboard/settings/billing/invoices/{$invoice->uuid}")->assertOk()->assertSee($invoice->invoice_number)->assertSee('Tax Invoice');
        $this->actingAs($this->creator)->get("/dashboard/settings/billing/invoices/{$invoice->id}")->assertNotFound();
        $this->actingAs($other)->get("/dashboard/settings/billing/invoices/{$invoice->uuid}")->assertNotFound();
    }

    public function test_sub_admins_cannot_open_billing_or_buy(): void
    {
        $member = User::factory()->createOne(['role' => 'sub_admin', 'parent_creator_id' => $this->creator->id, 'username' => 'helper']);

        $this->actingAs($member)->get('/dashboard/settings/billing')->assertForbidden();
        $this->actingAs($member)->postJson('/dashboard/settings/billing/checkout', ['months' => 1])->assertForbidden();
    }

    // ---------------------------------------------------------------- numbering / commands

    public function test_invoice_numbers_run_in_sequence_within_the_financial_year(): void
    {
        foreach ([1, 2] as $n) {
            $this->checkout(1);
            $this->actingAs($this->creator)->postJson('/dashboard/settings/billing/verify', $this->verifyPayload("order_T{$n}", "pay_{$n}"))->assertOk();
        }

        $fy = InvoiceNumber::financialYear();
        $this->assertSame(["INV-{$fy}-000001", "INV-{$fy}-000002"], BillingInvoice::orderBy('id')->pluck('invoice_number')->all());

        // April se naya saal
        $this->assertSame('2627', InvoiceNumber::financialYear(Carbon::parse('2026-04-01 10:00', 'Asia/Kolkata')));
        $this->assertSame('2526', InvoiceNumber::financialYear(Carbon::parse('2026-03-31 10:00', 'Asia/Kolkata')));
    }

    public function test_abandoned_checkouts_are_closed_after_the_ttl(): void
    {
        $this->checkout(1);
        PlanPurchase::query()->update(['created_at' => now()->subHour()]);

        $this->artisan('billing:expire-pending')->assertSuccessful();

        $this->assertSame('failed', PlanPurchase::first()->status);
    }

    public function test_reminder_goes_only_to_creators_expiring_on_a_reminder_day(): void
    {
        $soon = User::factory()->createOne(['role' => 'creator', 'username' => 'soon', 'plan' => 'pro', 'plan_expires_at' => now('Asia/Kolkata')->addDays(3)->setTime(12, 0)]);
        $later = User::factory()->createOne(['role' => 'creator', 'username' => 'later', 'plan' => 'pro', 'plan_expires_at' => now('Asia/Kolkata')->addDays(5)->setTime(12, 0)]);

        $this->artisan('billing:remind')->assertSuccessful();

        Mail::assertSent(PlanExpiringMail::class, fn ($mail) => $mail->hasTo($soon->email) && $mail->daysLeft === 3);
        Mail::assertNotSent(PlanExpiringMail::class, fn ($mail) => $mail->hasTo($later->email));
    }
}
