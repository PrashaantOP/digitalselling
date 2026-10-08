<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\AdminAuditLog;
use App\Models\KycVerification;
use App\Models\Order;
use App\Models\PayoutMethod;
use App\Models\Product;
use App\Models\Settlement;
use App\Models\User;
use App\Services\SettlementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class AdminModulesTest extends TestCase
{
    use RefreshDatabase;

    private Admin $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = new Admin(['name' => 'Ops', 'email' => 'ops@platform.test']);
        $this->admin->forceFill(['password' => 'Sup3r$ecretPass', 'is_active' => true])->save();
    }

    private function asAdmin(): static
    {
        return $this->actingAs($this->admin, 'admin');
    }

    private function creator(): User
    {
        /** @var User $creator */
        $creator = User::factory()->createOne(['role' => 'creator', 'username' => 'maker' . User::count()]);

        return $creator;
    }

    private function audited(string $action): bool
    {
        return AdminAuditLog::where('action', $action)->where('admin_id', $this->admin->id)->exists();
    }

    public function test_every_admin_page_renders(): void
    {
        $creator = $this->creator();
        $kyc = KycVerification::create(['user_id' => $creator->id, 'legal_name' => 'Test', 'pan_number' => 'ABCDE1234F', 'status' => 'pending']);

        foreach ([
            '/admin' => 'Admin/Dashboard',
            '/admin/creators' => 'Admin/Creators/Index',
            "/admin/creators/{$creator->uuid}" => 'Admin/Creators/Show',
            '/admin/kyc' => 'Admin/Kyc/Index',
            "/admin/kyc/{$kyc->uuid}" => 'Admin/Kyc/Show',
            '/admin/payout-methods' => 'Admin/PayoutMethods/Index',
            '/admin/settlements' => 'Admin/Settlements/Index',
            '/admin/orders' => 'Admin/Orders/Index',
            '/admin/audit' => 'Admin/Audit/Index',
        ] as $url => $component) {
            $this->asAdmin()->get($url)->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->component($component)->has('admin')->missing('auth'));
        }
    }

    public function test_numeric_ids_are_rejected(): void
    {
        $creator = $this->creator();

        $this->asAdmin()->get("/admin/creators/{$creator->id}")->assertNotFound();
        $this->asAdmin()->get("/admin/creators/{$creator->uuid}")->assertOk();
    }

    public function test_kyc_approve_and_reject(): void
    {
        Storage::fake('local');
        $creator = $this->creator();
        Storage::disk('local')->put('kyc/pan.png', 'img');
        $kyc = KycVerification::create(['user_id' => $creator->id, 'legal_name' => 'Test', 'pan_number' => 'ABCDE1234F', 'id_document_path' => 'kyc/pan.png', 'status' => 'pending']);

        $this->asAdmin()->get("/admin/kyc/{$kyc->uuid}/document")->assertOk();
        $this->assertTrue($this->audited('kyc.document_viewed'));

        $this->asAdmin()->post("/admin/kyc/{$kyc->uuid}/reject", [])->assertSessionHasErrors('reason');
        $this->asAdmin()->post("/admin/kyc/{$kyc->uuid}/approve")->assertRedirect('/admin/kyc');
        $this->assertSame('verified', $kyc->fresh()->status);
        $this->assertTrue($this->audited('kyc.approved'));

        // dobara review nahi
        $this->asAdmin()->post("/admin/kyc/{$kyc->uuid}/reject", ['reason' => 'x'])->assertSessionHasErrors('status');
    }

    public function test_payout_method_verify_and_revoke(): void
    {
        $creator = $this->creator();
        $method = PayoutMethod::create(['user_id' => $creator->id, 'type' => 'upi', 'upi_id' => 'maker@okaxis', 'is_default' => true]);

        $this->asAdmin()->post("/admin/payout-methods/{$method->uuid}/verify")->assertSessionHasNoErrors();
        $this->assertTrue($method->fresh()->isVerified());

        $this->asAdmin()->post("/admin/payout-methods/{$method->uuid}/revoke", ['reason' => 'UPI belongs to someone else'])->assertSessionHasNoErrors();
        $this->assertFalse($method->fresh()->isVerified());
        $this->assertTrue($this->audited('payout_method.verified'));
        $this->assertTrue($this->audited('payout_method.revoked'));
    }

    public function test_settlement_mark_paid_needs_utr_and_is_audited(): void
    {
        $creator = $this->creator();
        KycVerification::create(['user_id' => $creator->id, 'legal_name' => 'Test', 'pan_number' => 'ABCDE1234F', 'status' => 'verified']);
        PayoutMethod::create(['user_id' => $creator->id, 'type' => 'upi', 'upi_id' => 'maker@okaxis', 'is_default' => true])->markVerified();
        $product = Product::create(['creator_id' => $creator->id, 'type' => 'payment_page', 'title' => 'Call', 'slug' => 'call-x']);
        Order::create([
            'order_number' => 'ORD-0001', 'creator_id' => $creator->id, 'product_id' => $product->id, 'buyer_phone' => '9876543210',
            'base_amount' => 1000, 'total_amount' => 1000, 'commission_rate' => 10, 'platform_fee' => 100, 'net_payout_amount' => 900,
            'status' => 'success', 'paid_at' => now()->subDays(3),
        ]);

        $this->asAdmin()->getJson('/admin/settlements/preview')->assertOk()->assertJsonPath('rows.0.orders', 1);
        $this->asAdmin()->post('/admin/settlements/run')->assertSessionHasNoErrors();
        $settlement = Settlement::firstOrFail();

        $this->asAdmin()->post("/admin/settlements/{$settlement->uuid}/paid", [])->assertSessionHasErrors('reference');
        $this->asAdmin()->post("/admin/settlements/{$settlement->uuid}/paid", ['reference' => 'UTR123456'])->assertSessionHasNoErrors();

        $this->assertSame('paid', $settlement->fresh()->status);
        $this->assertSame('UTR123456', $settlement->fresh()->reference_number);
        $this->assertTrue($this->audited('settlements.run'));
        $this->assertTrue($this->audited('settlement.marked_paid'));

        // paid ko dobara fail nahi kar sakte
        $this->asAdmin()->post("/admin/settlements/{$settlement->uuid}/failed", ['reason' => 'x'])->assertStatus(422);
        $this->assertSame(0, app(SettlementService::class)->eligibleOrders($creator->id)->count());
    }

    public function test_suspending_a_creator_kills_sessions_and_closes_the_store(): void
    {
        $creator = $this->creator();
        $product = Product::create(['creator_id' => $creator->id, 'type' => 'payment_page', 'title' => 'Call', 'slug' => 'call-y', 'status' => 'published']);
        DB::table('sessions')->insert(['id' => 'sess-1', 'user_id' => $creator->id, 'payload' => '', 'last_activity' => time()]);

        $this->asAdmin()->post("/admin/creators/{$creator->uuid}/suspend", [])->assertSessionHasErrors('reason');
        $this->asAdmin()->post("/admin/creators/{$creator->uuid}/suspend", ['reason' => 'Fraud report'])->assertSessionHasNoErrors();

        $this->assertSame('suspended', $creator->fresh()->status);
        $this->assertSame(0, DB::table('sessions')->where('user_id', $creator->id)->count());
        $this->assertTrue($this->audited('creator.suspended'));

        // public product page + checkout band
        $this->get("/p/{$product->slug}")->assertNotFound();
        $this->postJson("/checkout/{$product->uuid}/order", [])->assertNotFound();

        $this->asAdmin()->post("/admin/creators/{$creator->uuid}/activate")->assertSessionHasNoErrors();
        $this->assertSame('active', $creator->fresh()->status);
    }

    public function test_plan_change_is_audited(): void
    {
        $creator = $this->creator();

        $this->asAdmin()->put("/admin/creators/{$creator->uuid}/plan", ['plan' => 'plus', 'plan_expires_at' => now()->addMonth()->toDateString()])->assertSessionHasNoErrors();

        $this->assertSame('plus', $creator->fresh()->plan);
        $this->assertTrue($this->audited('creator.plan_changed'));
    }

    public function test_order_search_finds_by_buyer_email(): void
    {
        $creator = $this->creator();
        $product = Product::create(['creator_id' => $creator->id, 'type' => 'payment_page', 'title' => 'Call', 'slug' => 'call-z']);
        $order = Order::create([
            'order_number' => 'ORD-0042', 'creator_id' => $creator->id, 'product_id' => $product->id, 'buyer_phone' => '9876543210', 'buyer_email' => 'buyer@find.me',
            'base_amount' => 500, 'total_amount' => 500, 'commission_rate' => 10, 'platform_fee' => 50, 'net_payout_amount' => 450, 'status' => 'success',
        ]);

        $this->asAdmin()->get('/admin/orders?q=find.me')
            ->assertInertia(fn (AssertableInertia $page) => $page->has('orders.data', 1)->where('orders.data.0.order_number', 'ORD-0042'));
        $this->asAdmin()->get("/admin/orders/{$order->uuid}")->assertOk();
    }

    /** Payout ke liye tayyar creator + ek settle hone layak order → pending settlement. */
    private function pendingSettlement(string $orderNumber = 'ORD-0100'): Settlement
    {
        $creator = $this->creator();
        KycVerification::create(['user_id' => $creator->id, 'legal_name' => 'Test', 'pan_number' => 'ABCDE1234F', 'status' => 'verified']);
        PayoutMethod::create(['user_id' => $creator->id, 'type' => 'bank_transfer', 'account_holder_name' => 'Test Maker', 'account_number' => '123456789012', 'ifsc' => 'HDFC0001234', 'is_default' => true])->markVerified();
        $product = Product::create(['creator_id' => $creator->id, 'type' => 'payment_page', 'title' => 'Call', 'slug' => 'call-' . $orderNumber]);
        Order::create([
            'order_number' => $orderNumber, 'creator_id' => $creator->id, 'product_id' => $product->id, 'buyer_phone' => '9876543210',
            'base_amount' => 1000, 'total_amount' => 1000, 'commission_rate' => 10, 'platform_fee' => 100, 'net_payout_amount' => 900,
            'status' => 'success', 'paid_at' => now()->subDays(3),
        ]);

        return app(SettlementService::class)->settleCreator($creator);
    }

    public function test_export_gives_a_bank_file_and_moves_settlements_to_processing(): void
    {
        $settlement = $this->pendingSettlement();

        $csv = $this->asAdmin()->post('/admin/settlements/export')->assertOk()->streamedContent();

        $this->assertStringContainsString($settlement->number, $csv);
        $this->assertStringContainsString('HDFC0001234', $csv);
        $this->assertStringContainsString('900.00', $csv);
        $this->assertSame('processing', $settlement->fresh()->status);
        $this->assertTrue($this->audited('settlements.exported'));

        // dobara export me wahi batch nahi aata
        $this->asAdmin()->post('/admin/settlements/export')->assertStatus(422);
    }

    public function test_uploading_utrs_marks_matching_settlements_paid_and_skips_the_rest(): void
    {
        $paid = $this->pendingSettlement('ORD-0101');
        $waiting = $this->pendingSettlement('ORD-0102');

        $file = \Illuminate\Http\UploadedFile::fake()->createWithContent('utrs.csv', implode("\n", [
            'Settlement,Creator,Amount,UTR',
            "{$paid->number},Maker,900.00,UTR555",
            "{$waiting->number},Maker,900.00,",   // UTR abhi nahi aaya
            'STL-NOPE-0001,Ghost,10.00,UTR000',    // aisa settlement hai hi nahi
        ]));

        $this->asAdmin()->post('/admin/settlements/bulk-paid', ['file' => $file])->assertSessionHasNoErrors()->assertSessionHas('status');

        $this->assertSame('paid', $paid->fresh()->status);
        $this->assertSame('UTR555', $paid->fresh()->reference_number);
        $this->assertSame('pending', $waiting->fresh()->status);
        $this->assertTrue($this->audited('settlements.bulk_paid'));
    }

    public function test_utr_upload_rejects_a_file_without_the_right_columns(): void
    {
        $file = \Illuminate\Http\UploadedFile::fake()->createWithContent('wrong.csv', "Name,Amount\nA,10");

        $this->asAdmin()->post('/admin/settlements/bulk-paid', ['file' => $file])->assertSessionHasErrors('file');
    }

    public function test_admin_can_add_a_settlement_adjustment_and_it_is_audited(): void
    {
        $creator = $this->creator();

        $this->asAdmin()->post("/admin/creators/{$creator->uuid}/adjustments", ['type' => 'manual_debit', 'amount' => 250, 'reason' => 'Duplicate payout'])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('settlement_adjustments', ['creator_id' => $creator->id, 'type' => 'manual_debit', 'amount' => -250, 'admin_id' => $this->admin->id, 'settlement_id' => null]);
        $this->assertTrue($this->audited('settlement_adjustment.added'));

        $this->asAdmin()->post("/admin/creators/{$creator->uuid}/adjustments", ['type' => 'refund_reversal', 'amount' => 10, 'reason' => 'x'])->assertSessionHasErrors('type');
        $this->asAdmin()->get("/admin/creators/{$creator->uuid}")->assertInertia(fn (AssertableInertia $page) => $page->has('pendingAdjustments', 1)->has('planPurchases', 0));
    }

    public function test_billing_page_lists_plus_payments_with_month_totals(): void
    {
        $creator = $this->creator();
        $plan = \App\Models\SubscriptionPlan::where('slug', 'plus')->firstOrFail();
        $purchase = \App\Models\PlanPurchase::create(['user_id' => $creator->id, 'plan_id' => $plan->id, 'months' => 1, 'unit_price' => 499, 'subtotal' => 499, 'amount_payable' => 499, 'gateway' => 'razorpay']);
        $purchase->forceFill(['status' => 'paid', 'paid_at' => now(), 'gateway_payment_id' => 'pay_admin1'])->save();
        $invoice = \App\Models\BillingInvoice::create([
            'user_id' => $creator->id, 'plan_purchase_id' => $purchase->id, 'invoice_number' => 'INV-2627-000001', 'amount' => 499,
            'taxable_amount' => 422.88, 'gst_rate' => 18, 'igst_amount' => 76.12, 'status' => 'paid', 'paid_at' => now(), 'created_at' => now(),
        ]);

        $this->asAdmin()->get('/admin/billing')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Admin/Billing/Index')
            ->has('items.data', 1)
            ->where('items.data.0.invoice.invoice_number', 'INV-2627-000001')
            ->where('totals.month_revenue', 499)
            ->where('totals.month_gst', 76.12)
        );
        $this->asAdmin()->get('/admin/billing?q=pay_admin1&status=all')->assertInertia(fn (AssertableInertia $page) => $page->has('items.data', 1));

        $this->asAdmin()->get("/admin/billing/invoices/{$invoice->uuid}")->assertOk()->assertSee('INV-2627-000001');
        $this->asAdmin()->get("/admin/billing/invoices/{$invoice->id}")->assertNotFound();
    }
}
