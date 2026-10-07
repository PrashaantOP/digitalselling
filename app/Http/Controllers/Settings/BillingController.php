<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\BillingInvoice;
use App\Models\Order;
use App\Models\PayoutProfile;
use App\Models\SubscriptionPlan;
use App\Services\BillingService;
use App\Services\RazorpayService;
use App\Services\ReferralService;
use App\Services\SubscriptionService;
use App\Support\GstStates;
use App\Support\PlanPricing;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Dashboard → Settings → Billing. Sirf owner creator (routes me `owner` middleware) —
 * sub-admin plan nahi kharid sakta. Pro = monthly ₹499, auto-renew (Razorpay Subscription, SubscriptionService).
 */
class BillingController extends Controller
{
    public function __construct(
        private BillingService $billing,
        private ReferralService $referrals,
        private RazorpayService $razorpay,
        private SubscriptionService $subscriptions,
    ) {}

    public function edit(Request $request)
    {
        $user = $request->user();
        $pro = $this->billing->plan();
        $freeRate = (float) (SubscriptionPlan::where('slug', 'free')->value('commission_rate') ?? PlanPricing::FALLBACK_RATES['free']);
        $effective = PlanPricing::effectivePlan($user);
        $profile = $this->billing->billingProfile($user);

        // "Pro se kitna bachta" — andaza nahi, pichhle 30 din ki asli sales pe
        $sales = (float) Order::where('creator_id', $user->id)->where('status', 'success')
            ->where('paid_at', '>=', now()->subDays(30))->sum('total_amount');

        $subscription = $this->subscriptions->current($user);
        $price = (float) $pro->monthly_price;
        // trial / credit ka Pro chal raha ho to pehla charge uske baad (SubscriptionService::start jaisa hi)
        $firstCharge = $effective === 'pro' && $user->plan_expires_at?->gt(now()->addHour()) ? $user->plan_expires_at : null;

        return Inertia::render('settings/billing', [
            'plan' => [
                'effective' => $effective,
                'expires_at' => $effective === 'pro' ? $user->plan_expires_at : null,
                'permanent' => $this->billing->blockedReason($user) !== null,
                'commission_rate' => PlanPricing::commissionRate($user),
            ],
            'pro' => [
                'name' => $pro->name,
                'monthly_price' => $price,
                'commission_rate' => (float) $pro->commission_rate,
                'features' => $pro->features ?? [],
            ],
            'freeRate' => $freeRate,
            'price' => ['amount' => $price, 'first_charge_at' => $firstCharge] + $this->billing->taxSplit($price, $profile['gstin'], $profile['state']),
            'subscription' => $subscription ? [
                'status' => $subscription->status,
                'renews' => $subscription->renews(),
                // abhi tak koi charge nahi hua (trial ke baad shuru hogi) to agla charge = Pro khatam hone ka din
                'next_charge_at' => $subscription->renews()
                    ? ($subscription->status === 'authenticated' ? $user->plan_expires_at : $subscription->current_period_end)
                    : null,
                'failure_reason' => $subscription->failure_reason,
            ] : null,
            'creditBalance' => $this->referrals->balanceFor($user)['balance'],
            'billing' => $profile,
            'states' => GstStates::names(),
            'paymentsReady' => $this->subscriptions->ready(),
            'savings' => [
                'sales_30d' => $sales,
                'extra_commission' => round($sales * max(0, $freeRate - (float) $pro->commission_rate) / 100, 2),
            ],
            'invoices' => BillingInvoice::where('user_id', $user->id)->latest('id')->limit(24)->get()
                ->map(fn (BillingInvoice $i) => [
                    'uuid' => $i->uuid,
                    'number' => $i->invoice_number,
                    'description' => $i->description,
                    'amount' => (float) $i->amount,
                    'status' => $i->status,
                    'paid_at' => $i->paid_at,
                    'period_start' => $i->period_start,
                    'period_end' => $i->period_end,
                ]),
        ]);
    }

    /**
     * Auto-renew shuru — Razorpay subscription banata hai aur Checkout.js ka payload deta hai (JSON).
     * Mandate (card / UPI AutoPay) checkout me banta hai; phir har mahine Razorpay khud kaatta hai.
     */
    public function subscribe(Request $request)
    {
        $user = $request->user();
        $profile = $this->billing->billingProfile($user);

        $data = $request->validate([
            // state pata na ho to invoice pe CGST/SGST vs IGST tay nahi ho sakta
            'state' => [$profile['state'] ? 'nullable' : 'required', 'string', Rule::in(GstStates::names())],
        ]);

        if (! $profile['state']) {
            PayoutProfile::updateOrCreate(['user_id' => $user->id], ['state' => $data['state']] + ($user->payoutProfile ? [] : ['full_name' => $user->name]));
            $user->unsetRelation('payoutProfile');
        }

        $subscription = $this->subscriptions->start($user);

        return response()->json([
            'paid' => false,
            'key' => $this->razorpay->keyId(),
            'subscription_id' => $subscription->gateway_subscription_id,
            'name' => config('billing.seller.name'),
            'description' => 'Pro plan — monthly, auto-renews',
            'prefill' => ['name' => $user->name, 'email' => $user->email, 'contact' => $user->phone],
        ], 201);
    }

    /**
     * Checkout.js ka success handler. Signature sahi ho tabhi mandate maana jaata hai.
     * Browser band ho jaye to bhi webhook (subscription.*) yahi kaam kar deta hai.
     */
    public function verify(Request $request)
    {
        $data = $request->validate([
            'razorpay_subscription_id' => ['required', 'string', 'max:100'],
            'razorpay_payment_id' => ['required', 'string', 'max:100'],
            'razorpay_signature' => ['required', 'string', 'max:200'],
        ]);

        // service apne hi user ki subscription dhoondhti hai — kisi aur ki id bhej ke uska Pro chalu nahi hota
        $subscription = $this->subscriptions->verify($request->user(), $data['razorpay_payment_id'], $data['razorpay_subscription_id'], $data['razorpay_signature']);

        return response()->json([
            'paid' => true,
            'message' => $subscription->last_charged_at
                ? 'Payment received — Pro is active and renews every month.'
                : 'Auto-renew is on. Your first payment is taken when your current Pro period ends.',
        ]);
    }

    /** Auto-renew band — jo mahina paid hai wo poora chalta hai. */
    public function cancel(Request $request)
    {
        $this->subscriptions->cancel($request->user());

        return back()->with('status', 'Auto-renew is off. Pro stays on until the end of the period you have paid for.');
    }

    /** Printable tax invoice — naye tab me khulta hai, browser ke "Save as PDF" se download. */
    public function invoice(Request $request, BillingInvoice $billingInvoice)
    {
        // binding (routes/bindings.php) sirf apne hi invoice laati hai
        return response()->view('invoices.plan', [
            'invoice' => $billingInvoice->load('purchase'),
            'autoPrint' => $request->boolean('print'),
        ]);
    }
}
