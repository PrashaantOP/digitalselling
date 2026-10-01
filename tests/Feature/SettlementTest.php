<?php

namespace Tests\Feature;

use App\Models\KycVerification;
use App\Mail\SettlementStatusMail;
use App\Models\NotificationPreference;
use App\Models\Order;
use App\Models\PayoutMethod;
use App\Models\Product;
use App\Models\Settlement;
use App\Models\User;
use App\Services\SettlementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SettlementTest extends TestCase
{
    use RefreshDatabase;

    private SettlementService $settlements;

    protected function setUp(): void
    {
        parent::setUp();
        $this->settlements = app(SettlementService::class);
    }

    /** Payout ke liye tayyar creator: KYC verified + ek verified payout method. */
    private function creator(string $kycStatus = 'verified', bool $withMethod = true, bool $methodVerified = true): User
    {
        /** @var User $creator */
        $creator = User::factory()->createOne(['role' => 'creator', 'username' => 'maker' . User::count()]);

        KycVerification::create([
            'user_id' => $creator->id,
            'legal_name' => 'Test Creator',
            'pan_number' => 'ABCDE1234F',
            'status' => $kycStatus,
        ]);

        if ($withMethod) {
            $method = PayoutMethod::create(['user_id' => $creator->id, 'type' => 'upi', 'upi_id' => 'test@okhdfcbank', 'is_default' => true, 'current_password' => 'password']);

            if ($methodVerified) {
                $method->markVerified();
            }
        }

        return $creator;
    }

    /** Ek paid order us creator ke liye, $daysAgo din pehle. */
    private function order(User $creator, int $daysAgo, float $amount = 1000, string $status = 'success'): Order
    {
        $product = Product::create([
            'creator_id' => $creator->id,
            'type' => 'payment_page',
            'title' => 'Consulting call',
            'slug' => 'consulting-' . Product::count(),
        ]);

        $fee = round($amount * 0.10, 2);

        return Order::create([
            'order_number' => 'ORD-' . str_pad((string) (Order::count() + 1), 4, '0', STR_PAD_LEFT),
            'creator_id' => $creator->id,
            'product_id' => $product->id,
            'buyer_phone' => '9876543210',
            'base_amount' => $amount,
            'total_amount' => $amount,
            'commission_rate' => 10,
            'platform_fee' => $fee,
            'net_payout_amount' => $amount - $fee,
            'status' => $status,
            'paid_at' => $status === 'success' ? now()->subDays($daysAgo) : null,
        ]);
    }

    public function test_only_orders_past_the_hold_window_are_settled(): void
    {
        $creator = $this->creator();
        $old = $this->order($creator, 3);      // eligible
        $fresh = $this->order($creator, 0);    // abhi hold me

        $settlement = $this->settlements->settleCreator($creator);

        $this->assertNotNull($settlement);
        $this->assertSame(1, $settlement->orders_count);
        $this->assertSame($settlement->id, $old->fresh()->settlement_id);
        $this->assertNull($fresh->fresh()->settlement_id);
    }

    public function test_multiple_days_of_bookings_land_in_one_settlement(): void
    {
        $creator = $this->creator();
        foreach ([5, 4, 3, 2] as $daysAgo) {
            $this->order($creator, $daysAgo, 1000);
        }

        $settlement = $this->settlements->settleCreator($creator);

        $this->assertSame(4, $settlement->orders_count);
        $this->assertEquals(4000, (float) $settlement->gross_amount);
        $this->assertEquals(400, (float) $settlement->commission_amount);
        $this->assertEquals(3600, (float) $settlement->net_amount);
        $this->assertSame(1, Settlement::where('creator_id', $creator->id)->count());
    }

    public function test_pending_orders_are_never_settled(): void
    {
        $creator = $this->creator();
        $this->order($creator, 3, 1000, 'pending');

        $this->assertNull($this->settlements->settleCreator($creator));
    }

    public function test_unverified_kyc_blocks_settlement_and_money_accumulates(): void
    {
        $creator = $this->creator('pending');
        $order = $this->order($creator, 3);

        $this->assertSame('kyc', $this->settlements->blockedReason($creator));
        $this->assertNull($this->settlements->settleCreator($creator));
        $this->assertNull($order->fresh()->settlement_id);

        // KYC approve hote hi wahi order agli cycle me settle ho jaata hai
        $creator->kycVerification->update(['status' => 'verified']);
        $settlement = $this->settlements->settleCreator($creator->fresh());

        $this->assertSame(1, $settlement->orders_count);
    }

    public function test_missing_payout_method_blocks_settlement(): void
    {
        $creator = $this->creator('verified', withMethod: false);
        $this->order($creator, 3);

        $this->assertSame('payout_method', $this->settlements->blockedReason($creator));
        $this->assertNull($this->settlements->settleCreator($creator));
    }

    public function test_unverified_payout_method_blocks_settlement_until_verified(): void
    {
        $creator = $this->creator('verified', methodVerified: false);
        $order = $this->order($creator, 3);

        $this->assertSame('payout_unverified', $this->settlements->blockedReason($creator));
        $this->assertNull($this->settlements->settleCreator($creator));
        $this->assertNull($order->fresh()->settlement_id);

        $creator->payoutMethods()->first()->markVerified();

        $this->assertNull($this->settlements->blockedReason($creator));
        $this->assertSame(1, $this->settlements->settleCreator($creator)->orders_count);
    }

    public function test_unverified_default_does_not_fall_back_to_another_verified_method(): void
    {
        $creator = $this->creator('verified');
        PayoutMethod::where('user_id', $creator->id)->update(['is_default' => false]);
        PayoutMethod::create([
            'user_id' => $creator->id, 'type' => 'bank_transfer', 'account_holder_name' => 'Test Creator',
            'account_number' => '50100212345678', 'ifsc' => 'HDFC0001234', 'is_default' => true,
        ]);
        $this->order($creator, 3);

        $this->assertSame('payout_unverified', $this->settlements->blockedReason($creator));
        $this->assertNull($this->settlements->settleCreator($creator));
    }

    public function test_changing_payout_destination_resets_verification(): void
    {
        $creator = $this->creator('verified');
        $method = $creator->payoutMethods()->first();

        // same details dobara save — verification bani rehti hai
        $this->actingAs($creator)
            ->put('/dashboard/payments/account/payout-method', ['id' => $method->id, 'type' => 'upi', 'upi_id' => 'test@okhdfcbank', 'is_default' => true, 'current_password' => 'password'])
            ->assertSessionHasNoErrors();
        $this->assertTrue($method->fresh()->isVerified());

        // UPI badla — dobara verify hona padega
        $this->actingAs($creator)
            ->put('/dashboard/payments/account/payout-method', ['id' => $method->id, 'type' => 'upi', 'upi_id' => 'someone@okaxis', 'is_default' => true, 'current_password' => 'password'])
            ->assertSessionHasNoErrors();
        $this->assertFalse($method->fresh()->isVerified());
        $this->assertSame('payout_unverified', $this->settlements->blockedReason($creator));
    }

    public function test_running_the_cycle_twice_does_not_double_settle(): void
    {
        $creator = $this->creator();
        $this->order($creator, 3);

        $this->settlements->runAll();
        $this->settlements->runAll();

        $this->assertSame(1, Settlement::count());
    }

    public function test_failed_settlement_releases_its_orders_for_the_next_cycle(): void
    {
        $creator = $this->creator();
        $order = $this->order($creator, 3);
        $settlement = $this->settlements->settleCreator($creator);

        $this->settlements->markFailed($settlement, 'Bank rejected');

        $this->assertNull($order->fresh()->settlement_id);
        // history rehti hai — kitna attempt hua tha wo dikhna chahiye
        $this->assertSame(1, $settlement->fresh()->orders_count);

        $retry = $this->settlements->settleCreator($creator);
        $this->assertSame($retry->id, $order->fresh()->settlement_id);
    }

    public function test_marking_paid_records_the_bank_reference(): void
    {
        $creator = $this->creator();
        $this->order($creator, 3);
        $settlement = $this->settlements->settleCreator($creator);

        $this->settlements->markPaid($settlement, 'UTR123456');

        $settlement->refresh();
        $this->assertSame('paid', $settlement->status);
        $this->assertSame('UTR123456', $settlement->reference_number);
        $this->assertNotNull($settlement->processed_at);
    }

    public function test_balance_splits_money_into_clearing_in_transit_and_settled(): void
    {
        $creator = $this->creator();
        $this->order($creator, 3, 1000);   // settle hoga
        $this->order($creator, 0, 500);    // clearing me rahega

        $settlement = $this->settlements->settleCreator($creator);
        $balance = $this->settlements->balanceFor($creator->fresh());

        $this->assertEquals(900, $balance['in_transit']);
        $this->assertEquals(450, $balance['clearing']);
        $this->assertEquals(0, $balance['settled']);

        $this->settlements->markPaid($settlement, 'UTR999');
        $balance = $this->settlements->balanceFor($creator->fresh());

        $this->assertEquals(0, $balance['in_transit']);
        $this->assertEquals(900, $balance['settled']);
        $this->assertEquals(1350, $balance['lifetime_earned']);
    }

    public function test_settlement_page_shows_its_bookings_to_the_owner_only(): void
    {
        $creator = $this->creator();
        $this->order($creator, 3);
        $settlement = $this->settlements->settleCreator($creator);

        $this->actingAs($creator)
            ->get("/dashboard/settlements/{$settlement->uuid}")
            ->assertOk();

        // dusre creator ko 404 — binding tenant ke andar hi dhoondhti hai
        $this->actingAs($this->creator())
            ->get("/dashboard/settlements/{$settlement->uuid}")
            ->assertNotFound();
    }

    // ---------------------------------------------------------------- adjustments

    public function test_a_debit_adjustment_reduces_the_next_settlement(): void
    {
        $creator = $this->creator();
        $this->order($creator, 3, 1000); // net 900
        $this->settlements->addAdjustment($creator, 'manual_debit', 200, 'Refund recovered for ORD-0009');

        $this->assertEquals(-200, $this->settlements->balanceFor($creator)['adjustments']);

        $settlement = $this->settlements->settleCreator($creator);

        $this->assertSame('-200.00', $settlement->adjustment_amount);
        $this->assertSame('700.00', $settlement->net_amount);
        $this->assertSame(1, $settlement->adjustments()->count());
        $this->assertEquals(0, $this->settlements->balanceFor($creator)['adjustments']);
    }

    public function test_a_debit_larger_than_sales_holds_everything_until_sales_catch_up(): void
    {
        $creator = $this->creator();
        $first = $this->order($creator, 3, 1000); // net 900
        $this->settlements->addAdjustment($creator, 'manual_debit', 1500, 'Chargeback');

        $this->assertNull($this->settlements->settleCreator($creator));
        $this->assertNull($first->fresh()->settlement_id);

        $this->order($creator, 3, 2000); // net 1800 → 900 + 1800 − 1500 = 1200
        $settlement = $this->settlements->settleCreator($creator);

        $this->assertSame('1200.00', $settlement->net_amount);
        $this->assertSame(2, $settlement->orders_count);
    }

    public function test_a_credit_adjustment_is_paid_out_even_without_new_orders(): void
    {
        $creator = $this->creator();
        $this->settlements->addAdjustment($creator, 'manual_credit', 300, 'Goodwill credit');

        $result = $this->settlements->runAll();

        $this->assertSame(1, $result['settlements']);
        $this->assertSame('300.00', Settlement::first()->net_amount);
    }

    public function test_failed_settlement_releases_its_adjustments_too(): void
    {
        $creator = $this->creator();
        $this->order($creator, 3, 1000);
        $this->settlements->addAdjustment($creator, 'manual_debit', 100, 'Correction');
        $settlement = $this->settlements->settleCreator($creator);

        $this->settlements->markFailed($settlement, 'Bank rejected');

        $this->assertEquals(-100, $this->settlements->balanceFor($creator)['adjustments']);
        $this->assertSame('800.00', $this->settlements->settleCreator($creator)->net_amount);
    }

    // ---------------------------------------------------------------- mails / creator exports

    public function test_creator_is_emailed_when_a_settlement_is_paid_or_fails(): void
    {
        Mail::fake();
        $creator = $this->creator();
        $this->order($creator, 3);

        $this->settlements->markPaid($this->settlements->settleCreator($creator), 'UTR777');
        Mail::assertSent(SettlementStatusMail::class, fn ($mail) => $mail->hasTo($creator->email) && $mail->settlement->status === 'paid');

        $this->order($creator, 3);
        $this->settlements->markFailed($this->settlements->settleCreator($creator), 'Account closed');
        Mail::assertSent(SettlementStatusMail::class, fn ($mail) => $mail->settlement->status === 'failed');
    }

    public function test_no_email_when_the_creator_turned_payment_notifications_off(): void
    {
        Mail::fake();
        $creator = $this->creator();
        NotificationPreference::create(['user_id' => $creator->id, 'payment_received' => false]);
        $this->order($creator, 3);

        $this->settlements->markPaid($this->settlements->settleCreator($creator), 'UTR778');

        Mail::assertNothingSent();
    }

    public function test_statement_and_csv_export_are_only_for_the_owner(): void
    {
        $creator = $this->creator();
        $this->order($creator, 3);
        $this->settlements->addAdjustment($creator, 'manual_debit', 50, 'Correction');
        $settlement = $this->settlements->settleCreator($creator);

        $this->actingAs($creator)->get("/dashboard/settlements/{$settlement->uuid}/statement")
            ->assertOk()->assertSee($settlement->number)->assertSee('Correction');
        $this->actingAs($this->creator())->get("/dashboard/settlements/{$settlement->uuid}/statement")->assertNotFound();

        $csv = $this->actingAs($creator)->get('/dashboard/settlements/export')->assertOk()->streamedContent();
        $this->assertStringContainsString($settlement->number, $csv);
        $this->assertStringContainsString('850.00', $csv);
    }
}
