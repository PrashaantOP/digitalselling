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
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Admin khud chune hue orders ka settlement banata hai; jo chhoot jaye wo cycle utha leti hai. */
class AdminCustomSettlementTest extends TestCase
{
    use RefreshDatabase;

    private Admin $admin;

    private User $creator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = new Admin(['name' => 'Ops', 'email' => 'ops@platform.test']);
        $this->admin->forceFill(['password' => 'Sup3r$ecretPass', 'is_active' => true])->save();
        $this->creator = $this->creator();
    }

    private function asAdmin(): static
    {
        return $this->actingAs($this->admin, 'admin');
    }

    /** Payout ke liye tayyar creator (KYC + verified UPI), jab tak $ready false na ho. */
    private function creator(bool $ready = true): User
    {
        /** @var User $creator */
        $creator = User::factory()->createOne(['role' => 'creator', 'username' => 'maker' . User::count()]);

        if ($ready) {
            KycVerification::create(['user_id' => $creator->id, 'legal_name' => 'Test', 'pan_number' => 'ABCDE1234F', 'status' => 'verified']);
            PayoutMethod::create(['user_id' => $creator->id, 'type' => 'upi', 'upi_id' => 'maker@okaxis', 'is_default' => true])->markVerified();
        }

        return $creator;
    }

    private function order(User $creator, int $daysAgo, float $amount = 1000, string $status = 'success'): Order
    {
        $product = Product::create(['creator_id' => $creator->id, 'type' => 'payment_page', 'title' => 'Call', 'slug' => 'call-' . Product::count()]);

        return Order::create([
            'order_number' => 'ORD-' . str_pad((string) (Order::count() + 1), 4, '0', STR_PAD_LEFT), 'creator_id' => $creator->id, 'product_id' => $product->id,
            'buyer_phone' => '9876543210', 'base_amount' => $amount, 'total_amount' => $amount, 'commission_rate' => 10,
            'platform_fee' => $amount * 0.1, 'net_payout_amount' => $amount * 0.9,
            'status' => $status, 'paid_at' => $status === 'success' ? now()->subDays($daysAgo) : null,
        ]);
    }

    private function store(array $orders, array $adjustments = [], ?User $creator = null)
    {
        return $this->asAdmin()->post('/admin/settlements', [
            'creator' => ($creator ?? $this->creator)->uuid,
            'orders' => array_map(fn (Order $o) => $o->uuid, $orders),
            'adjustments' => $adjustments,
        ]);
    }

    public function test_the_page_lists_creators_then_that_creators_unsettled_orders(): void
    {
        $old = $this->order($this->creator, 5);
        $fresh = $this->order($this->creator, 0);
        $this->order($this->creator, 5, 500, 'pending'); // unpaid — kabhi nahi
        $blocked = $this->creator(false);
        $this->order($blocked, 5);

        $this->asAdmin()->get('/admin/settlements/create')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Settlements/Create')
            ->has('creators', 2)
            ->where('selected', null)
        );

        $this->asAdmin()->get("/admin/settlements/create?creator={$this->creator->uuid}")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('selected.blocked_reason', null)
            ->has('selected.orders', 2)
            ->where('selected.orders.0.uuid', $old->uuid)->where('selected.orders.0.on_hold', false)->where('selected.orders.0.too_new', false)
            ->where('selected.orders.1.uuid', $fresh->uuid)->where('selected.orders.1.on_hold', true)->where('selected.orders.1.too_new', true)
            ->where('selected.min_hours', 24)
            ->missing('selected.orders.0.id')
        );

        $this->asAdmin()->get("/admin/settlements/create?creator={$blocked->uuid}")->assertInertia(fn (Assert $page) => $page->where('selected.blocked_reason', 'kyc'));
        $this->asAdmin()->get("/admin/settlements/create?creator={$this->creator->id}")->assertNotFound(); // numeric id
    }

    public function test_admin_settles_only_the_picked_orders_and_the_cycle_picks_up_the_rest(): void
    {
        $picked = $this->order($this->creator, 5, 1000);
        $left = $this->order($this->creator, 4, 2000);

        $this->store([$picked])->assertSessionHasNoErrors()->assertRedirect('/admin/settlements/' . Settlement::firstOrFail()->uuid);

        $custom = Settlement::firstOrFail();
        $this->assertSame('pending', $custom->status);
        $this->assertSame(1, $custom->orders_count);
        $this->assertSame('900.00', $custom->net_amount);
        $this->assertSame($custom->id, $picked->fresh()->settlement_id);
        $this->assertNull($left->fresh()->settlement_id);
        $this->assertTrue(AdminAuditLog::where('action', 'settlement.created_custom')->exists());

        // jo chhoot gaya wo cycle (cron / button) me apne aap — aur pehla wala dobara nahi
        $this->asAdmin()->post('/admin/settlements/run')->assertSessionHasNoErrors();

        $this->assertSame(2, Settlement::count());
        $auto = Settlement::latest('id')->firstOrFail();
        $this->assertSame('1800.00', $auto->net_amount);
        $this->assertSame($auto->id, $left->fresh()->settlement_id);
        $this->assertSame($custom->id, $picked->fresh()->settlement_id);
    }

    public function test_an_order_can_be_settled_24_hours_after_payment_but_not_before(): void
    {
        $yesterday = $this->order($this->creator, 1, 1000); // 24 ghante ho gaye, par cycle ka T+2 hold abhi baaki
        $today = $this->order($this->creator, 0, 1000);
        $today->forceFill(['paid_at' => now()->subHours(23)])->save();

        $this->assertSame(0, app(SettlementService::class)->eligibleOrders($this->creator->id)->count()); // cycle dono ko nahi leti

        $this->store([$yesterday, $today])->assertSessionHasErrors('orders');
        $this->store([$today])->assertSessionHasErrors('orders');
        $this->assertSame(0, Settlement::count());

        $this->store([$yesterday])->assertSessionHasNoErrors();
        $this->assertNotNull($yesterday->fresh()->settlement_id);
        $this->assertNull($today->fresh()->settlement_id);

        // wahi order 24 ghante ka hote hi liya ja sakta hai
        $today->forceFill(['paid_at' => now()->subHours(24)->subMinute()])->save();
        $this->store([$today])->assertSessionHasNoErrors();
        $this->assertNotNull($today->fresh()->settlement_id);
    }

    public function test_adjustments_can_be_included_or_left_for_later(): void
    {
        $service = app(SettlementService::class);
        $order = $this->order($this->creator, 5, 1000);
        $debit = $service->addAdjustment($this->creator, 'manual_debit', 200, 'Chargeback', null, $this->admin);
        $credit = $service->addAdjustment($this->creator, 'manual_credit', 50, 'Goodwill', null, $this->admin);

        $this->store([$order], [$debit->uuid])->assertSessionHasNoErrors();

        $settlement = Settlement::firstOrFail();
        $this->assertSame('-200.00', $settlement->adjustment_amount);
        $this->assertSame('700.00', $settlement->net_amount);
        $this->assertSame($settlement->id, $debit->fresh()->settlement_id);
        $this->assertNull($credit->fresh()->settlement_id); // agli baar
    }

    public function test_it_refuses_bad_selections_and_creates_nothing(): void
    {
        $order = $this->order($this->creator, 5, 1000);
        $unpaid = $this->order($this->creator, 5, 1000, 'pending');
        $other = $this->creator();
        $foreign = $this->order($other, 5);
        $debit = app(SettlementService::class)->addAdjustment($this->creator, 'manual_debit', 5000, 'Too big', null, $this->admin);

        $this->store([])->assertSessionHasErrors('orders');
        $this->store([$unpaid])->assertSessionHasErrors('orders');
        $this->store([$order, $foreign])->assertSessionHasErrors('orders'); // doosre creator ka order
        $this->store([$order], [$debit->uuid])->assertSessionHasErrors('orders'); // net zero se kam

        // KYC / payout method ke bina custom bhi nahi
        $blocked = $this->creator(false);
        $this->store([$this->order($blocked, 5)], [], $blocked)->assertSessionHasErrors('creator');

        $this->assertSame(0, Settlement::count());
        $this->assertNull($order->fresh()->settlement_id);

        // ek order do settlement me kabhi nahi
        $this->store([$order])->assertSessionHasNoErrors();
        $this->store([$order])->assertSessionHasErrors('orders');
        $this->assertSame(1, Settlement::count());
    }

    public function test_only_an_admin_can_create_a_settlement(): void
    {
        $order = $this->order($this->creator, 5);

        $this->post('/admin/settlements', ['creator' => $this->creator->uuid, 'orders' => [$order->uuid]])->assertRedirect();
        $this->actingAs($this->creator)->post('/admin/settlements', ['creator' => $this->creator->uuid, 'orders' => [$order->uuid]])->assertRedirect();
        $this->actingAs($this->creator)->get('/admin/settlements/create')->assertRedirect();

        $this->assertSame(0, Settlement::count());
    }
}
