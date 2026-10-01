<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\BillingInvoice;
use App\Models\Order;
use App\Models\PayoutProfile;
use App\Models\PlanPurchase;
use App\Models\SubscriptionPlan;
use App\Services\BillingService;
use App\Services\RazorpayService;
use App\Services\ReferralService;
use App\Support\GstStates;
use App\Support\PlanPricing;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Dashboard → Settings → Billing. Sirf owner creator (routes me `owner` middleware) —
 * sub-admin plan nahi kharid sakta. Pro prepaid hai: mahine chuno, ek baar pay karo.
 */
class BillingController extends Controller
{
    public function __construct(private BillingService $billing, private ReferralService $referrals, private RazorpayService $razorpay) {}

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

        return Inertia::render('settings/billing', [
            'plan' => [
                'effective' => $effective,
                'expires_at' => $effective === 'pro' ? $user->plan_expires_at : null,
                'permanent' => $this->billing->blockedReason($user) !== null,
                'commission_rate' => PlanPricing::commissionRate($user),
            ],
            'pro' => [
                'name' => $pro->name,
                'monthly_price' => (float) $pro->monthly_price,
                'commission_rate' => (float) $pro->commission_rate,
                'features' => $pro->features ?? [],
            ],
            'freeRate' => $freeRate,
            // har duration ka hisaab credit ke saath aur bina — page turant switch kar sake
            'quotes' => collect($this->billing->durations())->map(fn (int $months) => [
                'months' => $months,
                'plain' => $this->billing->quote($user, $months, false),
                'withCredit' => $this->billing->quote($user, $months, true),
            ])->values(),
            'creditBalance' => $this->referrals->balanceFor($user)['balance'],
            'billing' => $profile,
            'states' => GstStates::names(),
            'paymentsReady' => $this->razorpay->configured(),
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
     * Pending kharid + Razorpay order banata hai aur Checkout.js ka payload deta hai (axios JSON).
     * Poora amount referral credit se ho jaye to `paid: true` — gateway khulta hi nahi.
     */
    public function checkout(Request $request)
    {
        $user = $request->user();
        $profile = $this->billing->billingProfile($user);

        $data = $request->validate([
            'months' => ['required', 'integer', Rule::in($this->billing->durations())],
            'use_credit' => ['sometimes', 'boolean'],
            // state pata na ho to invoice pe CGST/SGST vs IGST tay nahi ho sakta
            'state' => [$profile['state'] ? 'nullable' : 'required', 'string', Rule::in(GstStates::names())],
        ]);

        if (! $profile['state']) {
            PayoutProfile::updateOrCreate(['user_id' => $user->id], ['state' => $data['state']] + ($user->payoutProfile ? [] : ['full_name' => $user->name]));
            $user->unsetRelation('payoutProfile');
        }

        $purchase = $this->billing->start($user, (int) $data['months'], (bool) ($data['use_credit'] ?? false));

        if ($purchase->status === 'paid') {
            return response()->json(['paid' => true, 'message' => 'Pro is active on your account.']);
        }

        return response()->json([
            'paid' => false,
            'key' => $this->razorpay->keyId(),
            'order_id' => $purchase->gateway_order_id,
            'amount' => (int) round((float) $purchase->amount_payable * 100),
            'name' => config('billing.seller.name'),
            'description' => 'Pro plan — ' . $purchase->months . ' month' . ($purchase->months > 1 ? 's' : ''),
            'prefill' => ['name' => $user->name, 'email' => $user->email, 'contact' => $user->phone],
        ], 201);
    }

    /**
     * Checkout.js ka success handler yahan aata hai. Signature sahi ho tabhi Pro milta hai.
     * Browser band ho jaye to bhi webhook (RazorpayWebhookController) yahi kaam kar deta hai.
     */
    public function verify(Request $request)
    {
        $data = $request->validate([
            'razorpay_order_id' => ['required', 'string', 'max:100'],
            'razorpay_payment_id' => ['required', 'string', 'max:100'],
            'razorpay_signature' => ['required', 'string', 'max:200'],
        ]);

        // apni hi kharid — kisi aur ka order id bhej ke uska plan activate na ho
        $purchase = PlanPurchase::where('user_id', $request->user()->id)
            ->where('gateway_order_id', $data['razorpay_order_id'])->firstOrFail();

        if (! $this->razorpay->validPaymentSignature($data['razorpay_order_id'], $data['razorpay_payment_id'], $data['razorpay_signature'])) {
            throw ValidationException::withMessages(['payment' => 'We could not verify this payment. If money was deducted, it will reflect here in a few minutes.']);
        }

        $this->billing->fulfil($purchase, $data['razorpay_payment_id']);

        return response()->json(['paid' => true, 'message' => 'Payment received — Pro is active.']);
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
