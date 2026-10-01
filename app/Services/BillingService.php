<?php

namespace App\Services;

use App\Mail\PlanPurchasedMail;
use App\Models\BillingInvoice;
use App\Models\PlanPurchase;
use App\Models\ReferralCredit;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Support\GstStates;
use App\Support\InvoiceNumber;
use App\Support\PlanPricing;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/**
 * Creator ki Pro plan billing — PREPAID. Creator 1/3/6/12 mahine ek baar pay karta hai aur
 * `users.plan_expires_at` aage badh jaata hai (wahi mechanism jo trial aur referral credit use karte hain).
 * Auto-debit nahi hai; expiry se pehle `billing:remind` mail bhejta hai.
 *
 * Price GST-inclusive hai: creator ₹499 deta hai, invoice me tax andar se nikalta hai.
 * Referral credit kharid me part-payment ki tarah lag sakta hai; poora credit se ho to gateway ki zaroorat hi nahi.
 */
class BillingService
{
    public function __construct(private RazorpayService $razorpay, private ReferralService $referrals) {}

    public function plan(): SubscriptionPlan
    {
        return SubscriptionPlan::where('slug', 'pro')->where('is_active', true)->firstOrFail();
    }

    /** @return int[] */
    public function durations(): array
    {
        return array_map('intval', config('billing.durations', [1]));
    }

    /**
     * `plan = pro` aur expiry null = permanent Pro (admin ne diya). Usme mahine jodne ka koi matlab nahi,
     * isliye kharid band — warna creator paisa de kar bhi kuch nahi paata.
     */
    public function blockedReason(User $user): ?string
    {
        return $user->plan === 'pro' && $user->plan_expires_at === null ? 'permanent_pro' : null;
    }

    /**
     * Invoice pe creator ki details. GSTIN sirf verified KYC se — bina verify ka number tax invoice pe nahi jaata.
     *
     * @return array{name: string, email: string, gstin: ?string, state: ?string}
     */
    public function billingProfile(User $user): array
    {
        $profile = $user->payoutProfile;
        $kyc = $user->kycVerification;
        $gstin = $kyc?->status === 'verified' ? ($kyc->gst_number ?: null) : null;

        return [
            'name' => $profile?->business_name ?: ($profile?->full_name ?: ($kyc?->legal_name ?: $user->name)),
            'email' => $profile?->email ?: $user->email,
            'gstin' => $gstin,
            'state' => GstStates::name(GstStates::code($gstin)) ?? $profile?->state,
        ];
    }

    /**
     * GST-inclusive total ka breakup. Seller aur buyer ka state same → CGST + SGST aadha-aadha, warna IGST.
     * Dono me se kisi ka state pata na ho to IGST.
     *
     * @return array{taxable: float, gst_rate: float, gst: float, cgst: float, sgst: float, igst: float}
     */
    public function taxSplit(float $total, ?string $buyerGstin, ?string $buyerState): array
    {
        $rate = (float) config('billing.gst_rate', 18);
        $taxable = round($total / (1 + $rate / 100), 2);
        $gst = round($total - $taxable, 2);

        $seller = GstStates::code(config('billing.seller.gstin'), config('billing.seller.state'));
        $buyer = GstStates::code($buyerGstin, $buyerState);
        $intraState = $seller !== null && $seller === $buyer;

        $cgst = $intraState ? round($gst / 2, 2) : 0.0;

        return [
            'taxable' => $taxable,
            'gst_rate' => $rate,
            'gst' => $gst,
            'cgst' => $cgst,
            'sgst' => $intraState ? round($gst - $cgst, 2) : 0.0,
            'igst' => $intraState ? 0.0 : $gst,
        ];
    }

    /**
     * Kharid ka poora hisaab — billing page aur asli order dono isi se bante hain, taaki jo dikhe wahi kate.
     */
    public function quote(User $user, int $months, bool $useCredit = false): array
    {
        $unit = (float) $this->plan()->monthly_price;
        $subtotal = round($months * $unit, 2);
        $discount = round($subtotal * ((float) (config('billing.discounts')[$months] ?? 0)) / 100, 2);
        $gross = round($subtotal - $discount, 2);

        $credit = $useCredit ? min($this->referrals->balanceFor($user)['balance'], $gross) : 0.0;
        $payable = round($gross - $credit, 2);

        // Razorpay ₹1 se kam ka order nahi leta — utna credit kam lagao
        if ($payable > 0 && $payable < 1) {
            $credit = round($gross - 1, 2);
            $payable = 1.0;
        }

        $profile = $this->billingProfile($user);

        return [
            'months' => $months,
            'unit_price' => $unit,
            'subtotal' => $subtotal,
            'discount' => $discount,
            'credit' => round($credit, 2),
            'payable' => $payable,
            'new_expiry' => $this->periodFor($user, $months)[1]->toIso8601String(),
        ] + $this->taxSplit($payable, $profile['gstin'], $profile['state']);
    }

    /**
     * Pending kharid + Razorpay order. Payable 0 ho (poora referral credit) to gateway ke bina turant fulfil.
     */
    public function start(User $user, int $months, bool $useCredit = false): PlanPurchase
    {
        if (! in_array($months, $this->durations(), true)) {
            throw ValidationException::withMessages(['months' => 'Choose one of the available durations.']);
        }

        if ($this->blockedReason($user) !== null) {
            throw ValidationException::withMessages(['months' => 'Your account already has Pro with no end date.']);
        }

        $quote = $this->quote($user, $months, $useCredit);

        if ($quote['payable'] > 0 && ! $this->razorpay->configured()) {
            throw ValidationException::withMessages(['months' => 'Online payments are not set up yet. Please try again later.']);
        }

        $purchase = $this->createPurchase($user, $quote, $quote['payable'] > 0 ? 'razorpay' : 'credit');

        if ($quote['payable'] <= 0) {
            return $this->fulfil($purchase);
        }

        $order = $this->razorpay->createOrder((int) round($quote['payable'] * 100), 'plan_' . $purchase->uuid, [
            'kind' => 'plan_purchase',
            'purchase' => $purchase->uuid,
        ]);

        $purchase->forceFill(['gateway_order_id' => $order['id']])->save();

        return $purchase;
    }

    /**
     * Refer & Earn page ka "credit → Pro mahine". Poore mahine credit se hi — balance kam ho to mana.
     * (ReferralService::redeem() isi ko call karta hai, taaki Pro milne ka ek hi raasta rahe.)
     */
    public function redeemWithCredit(User $user, int $months): ReferralCredit
    {
        return DB::transaction(function () use ($user, $months) {
            // do parallel redeem se balance negative na ho
            User::whereKey($user->id)->lockForUpdate()->first();

            $quote = $this->quote($user, $months, true);

            if ($quote['payable'] > 0) {
                throw ValidationException::withMessages(['months' => 'You do not have enough referral credit for that.']);
            }

            $purchase = $this->fulfil($this->createPurchase($user, $quote, 'credit'));

            return ReferralCredit::where('user_id', $user->id)->where('type', 'redeemed')
                ->where('meta->plan_purchase_id', $purchase->id)->firstOrFail();
        });
    }

    /**
     * Payment aa gayi — Pro do. IDEMPOTENT: checkout ka verify call aur webhook dono aayein to bhi
     * mahine ek hi baar judte hain aur invoice ek hi banta hai.
     *
     * Caller ki zimmedari: payment sach me hui hai ye pehle verify karna (signature / webhook).
     */
    public function fulfil(PlanPurchase $purchase, ?string $paymentId = null): PlanPurchase
    {
        $justPaid = false;

        $purchase = DB::transaction(function () use ($purchase, $paymentId, &$justPaid) {
            $purchase = PlanPurchase::whereKey($purchase->id)->lockForUpdate()->firstOrFail();

            if ($purchase->status === 'paid') {
                return $purchase;
            }

            $user = User::whereKey($purchase->user_id)->lockForUpdate()->firstOrFail();
            $before = $user->plan_expires_at;
            $permanent = $this->blockedReason($user) !== null;
            [$start, $end] = $this->periodFor($user, $purchase->months);

            // Credit yahin kat-ta hai (order banate waqt nahi) — payment fail ho to credit apne aap bacha rehta hai
            $credit = (float) $purchase->credit_applied;

            if ($credit > 0) {
                $balance = $this->referrals->balanceFor($user)['balance'];

                if ($balance < $credit) {
                    if ($purchase->gateway === 'credit') {
                        throw ValidationException::withMessages(['months' => 'You do not have enough referral credit for that.']);
                    }

                    // paisa aa chuka hai — Pro to dena hi hai; jitna credit bacha utna hi kaato aur kami report karo
                    report(new \RuntimeException("Plan purchase {$purchase->uuid}: referral credit short by " . ($credit - $balance)));
                    $credit = max(0.0, $balance);
                }
            }

            // permanent Pro ko expiry mat do (kharid waise blocked hai; ye sirf race ke liye)
            $user->forceFill(['plan' => 'pro', 'plan_expires_at' => $permanent ? null : $end])->save();

            $purchase->forceFill([
                'status' => 'paid',
                'gateway_payment_id' => $paymentId,
                'credit_applied' => $credit,
                'period_start' => $start,
                'period_end' => $end,
                'paid_at' => now(),
                'failure_reason' => null,
                'meta' => ($purchase->meta ?? []) + [
                    'plan_expires_at_before' => $before?->toIso8601String(),
                    'plan_expires_at_after' => $permanent ? null : $end->toIso8601String(),
                ],
            ])->save();

            if ($credit > 0) {
                $label = $purchase->months . ' month' . ($purchase->months > 1 ? 's' : '') . ' of Pro';

                ReferralCredit::create([
                    'user_id' => $user->id,
                    'referral_id' => null,
                    'type' => 'redeemed',
                    'amount' => $credit,
                    'description' => $purchase->gateway === 'credit' ? $label : "Applied to {$label}",
                    'meta' => [
                        'months' => $purchase->months,
                        'plan_purchase_id' => $purchase->id,
                        'plan_expires_at_before' => $before?->toIso8601String(),
                        'plan_expires_at_after' => $permanent ? null : $end->toIso8601String(),
                    ],
                ]);
            }

            // sirf credit wali kharid me koi paisa nahi aaya — tax invoice nahi banta
            if ((float) $purchase->amount_payable > 0) {
                $this->createInvoice($purchase, $user);
            }

            $justPaid = true;

            return $purchase;
        });

        if ($justPaid && (float) $purchase->amount_payable > 0) {
            $this->sendReceipt($purchase);
        }

        return $purchase;
    }

    public function fail(PlanPurchase $purchase, string $reason): void
    {
        PlanPurchase::whereKey($purchase->id)->where('status', 'pending')
            ->update(['status' => 'failed', 'failure_reason' => mb_substr($reason, 0, 250)]);
    }

    /** Adhoori chhodi hui checkouts ko band karo. Returns kitni rows fail hui. */
    public function expirePending(): int
    {
        return PlanPurchase::where('status', 'pending')
            ->where('created_at', '<', now()->subMinutes((int) config('billing.pending_ttl_minutes', 30)))
            ->update(['status' => 'failed', 'failure_reason' => 'Checkout was not completed.']);
    }

    /**
     * Naye mahine kab se kab tak: Pro (trial / credit / pichhli kharid) chal rahi ho to uske khatam hone ke BAAD se,
     * warna abhi se. Trial ke beech kharidne pe trial ke din zaya nahi hote.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    private function periodFor(User $user, int $months): array
    {
        $current = $user->plan_expires_at;
        $start = PlanPricing::effectivePlan($user) === 'pro' && $current?->isFuture() ? $current->copy() : now();

        return [$start, $start->copy()->addMonthsNoOverflow($months)];
    }

    private function createPurchase(User $user, array $quote, string $gateway): PlanPurchase
    {
        return PlanPurchase::create([
            'user_id' => $user->id,
            'plan_id' => $this->plan()->id,
            'months' => $quote['months'],
            'unit_price' => $quote['unit_price'],
            'subtotal' => $quote['subtotal'],
            'discount_amount' => $quote['discount'],
            'credit_applied' => $quote['credit'],
            'amount_payable' => $quote['payable'],
            'gateway' => $gateway,
        ]);
    }

    private function createInvoice(PlanPurchase $purchase, User $user): BillingInvoice
    {
        $profile = $this->billingProfile($user);
        $tax = $this->taxSplit((float) $purchase->amount_payable, $profile['gstin'], $profile['state']);

        return BillingInvoice::create([
            'user_id' => $user->id,
            'plan_purchase_id' => $purchase->id,
            'invoice_number' => InvoiceNumber::next(),
            'amount' => $purchase->amount_payable,
            'taxable_amount' => $tax['taxable'],
            'gst_rate' => $tax['gst_rate'],
            'cgst_amount' => $tax['cgst'],
            'sgst_amount' => $tax['sgst'],
            'igst_amount' => $tax['igst'],
            'credit_applied' => $purchase->credit_applied,
            'sac_code' => config('billing.sac_code'),
            'description' => 'Pro plan — ' . $purchase->months . ' month' . ($purchase->months > 1 ? 's' : ''),
            'billing_name' => $profile['name'],
            'billing_email' => $profile['email'],
            'billing_gstin' => $profile['gstin'],
            'billing_state' => $profile['state'],
            'seller' => config('billing.seller'),
            'period_start' => $purchase->period_start,
            'period_end' => $purchase->period_end,
            'status' => 'paid',
            'paid_at' => $purchase->paid_at,
            'created_at' => now(),
        ]);
    }

    /** Mail fail hone se payment fail nahi honi chahiye. */
    private function sendReceipt(PlanPurchase $purchase): void
    {
        try {
            $purchase->loadMissing(['user', 'invoice']);
            Mail::to($purchase->user->email)->send(new PlanPurchasedMail($purchase));
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
