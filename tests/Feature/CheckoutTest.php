<?php

namespace Tests\Feature;

use App\Mail\NewSaleMail;
use App\Mail\OrderReceiptMail;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Enrollment;
use App\Models\EventRegistration;
use App\Models\KycVerification;
use App\Models\LockedContentUnlock;
use App\Models\NotificationPreference;
use App\Models\Order;
use App\Models\PayoutMethod;
use App\Models\ProductAddon;
use App\Models\ReferralCredit;
use App\Services\ReferralService;
use App\Services\SettlementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\Feature\Concerns\SellsProducts;
use Tests\TestCase;

/** Buyer checkout: pending order → Razorpay → access. */
class CheckoutTest extends TestCase
{
    use RefreshDatabase, SellsProducts;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeGateways();
    }

    // ---------------------------------------------------------------- order + commission

    public function test_checkout_creates_a_pending_order_with_the_commission_snapshot(): void
    {
        $product = $this->product($this->seller());

        $this->checkout($product)->assertCreated()->assertJson(['paid' => false, 'order_id' => 'order_B1', 'amount' => 100000, 'key' => 'rzp_test_key']);

        $order = Order::firstOrFail();
        $this->assertSame('pending', $order->status);
        $this->assertSame('15.00', $order->commission_rate); // Free plan
        $this->assertSame('150.00', $order->platform_fee);
        $this->assertSame('850.00', $order->net_payout_amount);
        $this->assertSame('+919930412847', $order->buyer_phone);
        $this->assertSame(0, Enrollment::count()); // pay se pehle koi access nahi
    }

    public function test_pro_creator_orders_carry_the_pro_commission(): void
    {
        $product = $this->product($this->seller('pro', ['plan' => 'pro', 'plan_expires_at' => now()->addMonth()]));

        $this->checkout($product)->assertCreated();

        $this->assertSame('10.00', Order::first()->commission_rate);
        $this->assertSame('900.00', Order::first()->net_payout_amount);
    }

    public function test_discounted_price_coupon_and_addon_all_reach_the_total(): void
    {
        $creator = $this->seller();
        $product = $this->product($creator, 'course', ['price' => 1000, 'has_discount' => true, 'discounted_price' => 800]);
        $addon = $this->product($creator, 'book', ['price' => 200]);
        ProductAddon::create(['product_id' => $product->id, 'addon_product_id' => $addon->id]);
        Coupon::create(['product_id' => $product->id, 'code' => 'SAVE25', 'discount_percent' => 25, 'is_active' => true]);

        // live quote aur asli order ka hisaab ek hi hona chahiye
        $this->postJson("/checkout/{$product->uuid}/quote", ['coupon_code' => 'save25', 'addons' => [$addon->id]])
            ->assertOk()->assertJson(['base' => 800, 'discount' => 200, 'addons' => 200, 'total' => 800]);

        $this->checkout($product, ['coupon_code' => 'SAVE25', 'addons' => [$addon->id]])->assertCreated()->assertJson(['amount' => 80000]);

        $order = Order::firstOrFail();
        $this->assertSame('200.00', $order->discount_amount);
        $this->assertSame('200.00', $order->addon_amount);
        $this->assertSame(1, $order->addonItems()->count());
    }

    public function test_bad_coupons_and_foreign_addons_are_rejected(): void
    {
        $creator = $this->seller();
        $product = $this->product($creator);
        $stranger = $this->product($creator, 'book'); // is product ka add-on nahi hai
        Coupon::create(['product_id' => $product->id, 'code' => 'OLD', 'discount_percent' => 10, 'is_active' => true, 'expires_at' => now()->subDay()]);
        Coupon::create(['product_id' => $product->id, 'code' => 'FULL', 'discount_percent' => 10, 'is_active' => true, 'usage_limit' => 1, 'used_count' => 1]);

        $this->checkout($product, ['coupon_code' => 'OLD'])->assertJsonValidationErrors('coupon_code');
        $this->checkout($product, ['coupon_code' => 'FULL'])->assertJsonValidationErrors('coupon_code');
        $this->checkout($product, ['coupon_code' => 'NOPE'])->assertJsonValidationErrors('coupon_code');
        $this->checkout($product, ['addons' => [$stranger->id]])->assertJsonValidationErrors('addons');

        $this->assertSame(0, Order::count());
    }

    public function test_pay_what_you_want_respects_the_minimum(): void
    {
        $product = $this->product($this->seller(), 'payment_page', ['pricing_type' => 'customer_decides', 'price' => 100]);

        $this->checkout($product, ['amount' => 50])->assertJsonValidationErrors('amount');
        $this->checkout($product, ['amount' => 450])->assertCreated()->assertJson(['amount' => 45000]);
    }

    public function test_required_checkout_questions_are_enforced(): void
    {
        $product = $this->product($this->seller());
        $question = $product->checkoutQuestions()->create(['label' => 'Your college', 'field_type' => 'text', 'is_required' => true, 'is_enabled' => true, 'sort_order' => 5]);

        $this->checkout($product)->assertJsonValidationErrors("answers.{$question->id}");
        $this->checkout($product, ['answers' => [$question->id => 'IIT Patna']])->assertCreated();

        $this->assertSame('IIT Patna', Order::first()->checkoutAnswers()->value('answer'));
    }

    // ---------------------------------------------------------------- payment

    public function test_valid_signature_marks_the_order_paid_and_enrols_the_buyer(): void
    {
        $creator = $this->seller();
        $product = $this->product($creator);

        $this->checkout($product);
        $this->pay('order_B1')->assertOk()->assertJson(['paid' => true]);

        $order = Order::firstOrFail();
        $this->assertSame('success', $order->status);
        $this->assertSame('pay_1', $order->gateway_payment_id);
        $this->assertNotNull($order->paid_at);
        $this->assertSame(1, Enrollment::where('order_id', $order->id)->count());

        $this->assertSame(1, $product->fresh()->sales_count);
        $this->assertSame('1000.00', $product->fresh()->revenue_total);
        $customer = Customer::firstOrFail();
        $this->assertSame(1, $customer->total_orders);
        $this->assertSame('1000.00', $customer->total_spent);

        Mail::assertSent(OrderReceiptMail::class, fn ($m) => $m->hasTo('rohan@test.com') && str_contains($m->render(), '/me/login'));
        Mail::assertSent(NewSaleMail::class, fn ($m) => $m->hasTo($creator->email) && str_contains($m->render(), '850.00'));
    }

    public function test_wrong_signature_gives_no_access(): void
    {
        $this->checkout($this->product($this->seller()));

        $this->postJson('/checkout/verify', ['razorpay_order_id' => 'order_B1', 'razorpay_payment_id' => 'pay_1', 'razorpay_signature' => 'forged'])
            ->assertUnprocessable();

        $this->assertSame('pending', Order::first()->status);
        $this->assertSame(0, Enrollment::count());
    }

    public function test_verify_and_webhook_together_grant_access_once(): void
    {
        $product = $this->product($this->seller());
        Coupon::create(['product_id' => $product->id, 'code' => 'TEN', 'discount_percent' => 10, 'is_active' => true]);

        $this->checkout($product, ['coupon_code' => 'TEN']);
        $this->pay('order_B1')->assertOk();
        $this->webhook('payment.captured', 'order_B1', 90000)->assertOk();

        $this->assertSame(1, Enrollment::count());
        $this->assertSame(1, $product->fresh()->sales_count);
        $this->assertSame(1, Coupon::first()->used_count);
        Mail::assertSent(OrderReceiptMail::class, 1);
    }

    public function test_webhook_alone_fulfils_when_the_browser_never_came_back(): void
    {
        $this->checkout($this->product($this->seller()));

        $this->webhook('payment.captured', 'order_B1', 100000)->assertOk();

        $this->assertSame('success', Order::first()->status);
        $this->assertSame(1, Enrollment::count());
    }

    public function test_webhook_with_the_wrong_amount_is_not_fulfilled(): void
    {
        $this->checkout($this->product($this->seller()));

        $this->webhook('payment.captured', 'order_B1', 100)->assertOk()->assertJson(['status' => 'amount_mismatch']);

        $this->assertSame('pending', Order::first()->status);
    }

    public function test_free_product_is_fulfilled_without_the_gateway(): void
    {
        $product = $this->product($this->seller(), 'book', ['pricing_type' => 'free', 'price' => 0]);

        $this->checkout($product)->assertCreated()->assertJson(['paid' => true]);

        Http::assertNothingSent();
        $this->assertSame('success', Order::first()->status);
    }

    public function test_checkout_explains_itself_when_razorpay_keys_are_missing(): void
    {
        config(['services.razorpay.key_id' => null]);

        $this->checkout($this->product($this->seller()))->assertUnprocessable()->assertJsonValidationErrors('payment');

        $this->assertSame('failed', Order::first()->status);
    }

    // ---------------------------------------------------------------- access per product type

    public function test_course_with_limited_access_gets_an_expiry_and_buying_again_extends_it(): void
    {
        $product = $this->product($this->seller(), 'course', [], ['access_type' => 'days', 'access_days' => 30]);

        $this->buy($product);
        $this->assertEqualsWithDelta(30, (int) now()->diffInDays(Enrollment::first()->access_expires_at), 1);

        $this->buy($product);
        $this->assertSame(1, Enrollment::count()); // wahi row, expiry aage
        $this->assertEqualsWithDelta(60, (int) now()->diffInDays(Enrollment::first()->access_expires_at), 1);
    }

    public function test_event_registers_the_buyer_and_cannot_be_bought_twice(): void
    {
        $product = $this->product($this->seller(), 'event');

        $this->buy($product);
        $this->assertSame(1, EventRegistration::count());

        $this->checkout($product)->assertJsonValidationErrors('email');
    }

    public function test_locked_content_is_unlocked_and_addons_get_their_own_access(): void
    {
        $creator = $this->seller();
        $locked = $this->product($creator, 'locked_content');
        $course = $this->product($creator, 'course', ['price' => 300]);
        ProductAddon::create(['product_id' => $locked->id, 'addon_product_id' => $course->id]);

        $order = $this->buy($locked, ['addons' => [$course->id]]);

        $this->assertSame(1, LockedContentUnlock::where('order_id', $order->id)->count());
        $this->assertSame(1, Enrollment::where('order_id', $order->id)->count()); // add-on course
    }

    // ---------------------------------------------------------------- downstream

    public function test_creator_is_not_emailed_when_payment_notifications_are_off(): void
    {
        $creator = $this->seller();
        NotificationPreference::create(['user_id' => $creator->id, 'payment_received' => false]);

        // course ki sale "Course enrollment" switch pe chalti hai (NotificationPreferencesTest) — yahan e-book
        $this->buy($this->product($creator, 'book'));

        Mail::assertNotSent(NewSaleMail::class);
        Mail::assertSent(OrderReceiptMail::class);
    }

    public function test_first_sale_credits_the_referrer(): void
    {
        $referrer = $this->seller('referrer');
        $creator = $this->seller('referred');
        app(ReferralService::class)->attach($creator, app(ReferralService::class)->codeFor($referrer)->code);

        $this->buy($this->product($creator));

        $this->assertEquals(ReferralService::REWARD, ReferralCredit::where('user_id', $referrer->id)->where('type', 'earned')->sum('amount'));
    }

    public function test_paid_order_reaches_the_creators_settlement_after_the_hold(): void
    {
        $creator = $this->seller();
        KycVerification::create(['user_id' => $creator->id, 'legal_name' => 'Maker', 'pan_number' => 'ABCDE1234F', 'status' => 'verified']);
        PayoutMethod::create(['user_id' => $creator->id, 'type' => 'upi', 'upi_id' => 'maker@okaxis', 'is_default' => true])->markVerified();

        $this->buy($this->product($creator));

        $this->assertNull(app(SettlementService::class)->settleCreator($creator)); // T+2 hold
        $this->travel(3)->days();

        $this->assertSame('850.00', app(SettlementService::class)->settleCreator($creator)->net_amount);
    }

    public function test_abandoned_orders_are_closed_by_the_scheduler(): void
    {
        $this->checkout($this->product($this->seller()));
        Order::query()->update(['created_at' => now()->subHour()]);

        $this->artisan('orders:expire-pending')->assertSuccessful();

        $this->assertSame('failed', Order::first()->status);
    }
}
