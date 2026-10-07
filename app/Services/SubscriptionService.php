<?php

namespace App\Services;

use App\Mail\ProPaymentFailedMail;
use App\Mail\ProRenewedMail;
use App\Models\BillingInvoice;
use App\Models\Subscription;
use App\Models\User;
use App\Support\PlanPricing;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/**
 * Pro plan — monthly ₹499, AUTO-RENEW (Razorpay Subscriptions: card / UPI AutoPay).
 *
 *  start()   — Razorpay subscription banao, checkout usi id se khulta hai. Trial / credit ka Pro chal raha ho
 *              to pehla charge uske khatam hone pe (start_at) — creator ke din zaya nahi hote.
 *  verify()  — checkout ka success handler (signature + Razorpay se status).
 *  charged() — har mahine ka paisa aaya (verify ya webhook `subscription.charged`): plan_expires_at aage, GST invoice, mail.
 *              IDEMPOTENT — ek payment ka ek hi invoice (billing_invoices.gateway_payment_id unique).
 *  cancel()  — auto-renew band; chalu mahina poora chalta hai, phir plans:expire Free kar deta hai.
 *
 * Pro kab tak hai ye hamesha `users.plan_expires_at` batata hai — trial, referral credit, purani kharid sab wahi use karte hain.
 */
class SubscriptionService
{
    /** Agla charge thoda der se aaye (Razorpay retry) to beech me Pro na toote */
    private const GRACE_DAYS = 1;

    public function __construct(private RazorpayService $razorpay, private BillingService $billing) {}

    public function planId(): ?string
    {
        return config('services.razorpay.pro_plan_id') ?: null;
    }

    public function ready(): bool
    {
        return $this->razorpay->configured() && $this->planId() !== null;
    }

    /** Chalu subscription (authenticated / active / pending / halted), warna null. */
    public function current(User $user): ?Subscription
    {
        return Subscription::where('user_id', $user->id)->whereIn('status', Subscription::LIVE)->latest('id')->first();
    }

    /** Agle mahine apne aap katega? Referral redeem aur reminder mail isi se rukte hain. */
    public function renewing(User $user): bool
    {
        return (bool) $this->current($user)?->renews();
    }

    public function start(User $user): Subscription
    {
        if ($this->billing->blockedReason($user) !== null) {
            throw ValidationException::withMessages(['plan' => 'Your account already has Pro with no end date.']);
        }

        if (! $this->ready()) {
            throw ValidationException::withMessages(['plan' => 'Online payments are not set up yet. Please try again later.']);
        }

        if ($live = $this->current($user)) {
            if ($live->renews()) {
                throw ValidationException::withMessages(['plan' => 'Auto-renew is already on for your account.']);
            }

            // halted = purana card / UPI baar-baar fail — use band karke naya mandate.
            // (cancel ho chuki par mahina chal raha — wo apne aap khatam hogi; nayi uske baad se shuru)
            if ($live->status === 'halted') {
                $this->cancelAtGateway($live, false);
                $live->forceFill(['status' => 'cancelled', 'cancel_at_period_end' => true, 'cancelled_at' => now()])->save();
            }
        }

        // pichhle adhoore checkout (window khol ke band kar di) — ab kaam ke nahi
        Subscription::where('user_id', $user->id)->where('status', 'created')->update(['status' => 'abandoned']);

        // trial / credit / purani kharid ka Pro chal raha hai — pehla charge uske khatam hone pe
        $startAt = PlanPricing::effectivePlan($user) === 'pro' && $user->plan_expires_at?->gt(now()->addHour())
            ? $user->plan_expires_at->getTimestamp()
            : null;

        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $this->billing->plan()->id,
            'status' => 'created',
            'gateway' => 'razorpay',
        ]);

        try {
            $gateway = $this->razorpay->createSubscription($this->planId(), [
                'kind' => 'pro_subscription',
                'user' => $user->uuid,
                'subscription' => $subscription->uuid,
            ], $startAt);
        } catch (RequestException|ConnectionException $e) {
            report($e);
            $subscription->forceFill(['status' => 'abandoned'])->save();

            throw ValidationException::withMessages(['plan' => 'Could not start auto-renew with Razorpay. Please try again.']);
        }

        $subscription->forceFill(['gateway_subscription_id' => $gateway['id']])->save();

        return $subscription;
    }

    /**
     * Checkout.js ka success handler. Signature sahi = mandate ban gaya. Pehla charge abhi hua ho (trial nahi tha)
     * to Pro yahin chalu — browser band ho jaye to webhook wahi kaam karta hai.
     */
    public function verify(User $user, string $paymentId, string $subscriptionId, string $signature): Subscription
    {
        $subscription = Subscription::where('user_id', $user->id)->where('gateway_subscription_id', $subscriptionId)->firstOrFail();

        if (! $this->razorpay->validSubscriptionSignature($paymentId, $subscriptionId, $signature)) {
            throw ValidationException::withMessages(['payment' => 'We could not verify this payment. If money was deducted, it will reflect here in a few minutes.']);
        }

        try {
            $entity = $this->razorpay->fetchSubscription($subscriptionId);
        } catch (RequestException|ConnectionException $e) {
            // signature to sahi hai — mandate bana; charge webhook se aa jayega
            report($e);
            $this->sync($subscription, ['status' => 'authenticated']);

            return $subscription->refresh();
        }

        $this->sync($subscription, $entity);

        if (($entity['status'] ?? null) === 'active' && (int) ($entity['paid_count'] ?? 0) > 0) {
            try {
                $payment = $this->razorpay->fetchPayment($paymentId);

                if (($payment['status'] ?? null) === 'captured') {
                    $this->charged($subscription, $entity, $payment);
                }
            } catch (RequestException|ConnectionException $e) {
                report($e);
            }
        }

        return $subscription->refresh();
    }

    /** Ek mahine ka paisa aaya. Returns naya invoice, ya null (pehle hi ho chuka / khaali payment). */
    public function charged(Subscription $subscription, array $entity, array $payment): ?BillingInvoice
    {
        $paymentId = $payment['id'] ?? null;
        $amount = round(((int) ($payment['amount'] ?? 0)) / 100, 2);

        if (! $paymentId || $amount <= 0) {
            return null;
        }

        $first = false;

        $invoice = DB::transaction(function () use ($subscription, $entity, $payment, $paymentId, $amount, &$first) {
            $user = User::whereKey($subscription->user_id)->lockForUpdate()->firstOrFail();

            if (BillingInvoice::where('gateway_payment_id', $paymentId)->exists()) {
                return null;
            }

            $subscription = Subscription::whereKey($subscription->id)->lockForUpdate()->firstOrFail();
            $this->sync($subscription, $entity);

            $start = $this->time($entity['current_start'] ?? null) ?? now();
            $end = $this->time($entity['current_end'] ?? null) ?? $start->copy()->addMonthNoOverflow();
            $first = $subscription->last_charged_at === null;

            $subscription->forceFill([
                'current_period_start' => $start,
                'current_period_end' => $end,
                'last_charged_at' => now(),
                'failure_reason' => null,
            ])->save();

            // permanent Pro (admin ka diya) ko expiry mat do; credit / purani kharid aage tak ho to use chhota mat karo
            if ($this->billing->blockedReason($user) === null) {
                $until = $end->copy()->addDays(self::GRACE_DAYS);
                $keep = PlanPricing::effectivePlan($user) === 'pro' && $user->plan_expires_at?->gt($until);

                $user->forceFill(['plan' => 'pro', 'plan_expires_at' => $keep ? $user->plan_expires_at : $until])->save();
            }

            return $this->billing->issueInvoice($user, $amount, 'Pro plan — monthly (auto-renew)', $start, $end, $this->time($payment['created_at'] ?? null), [
                'subscription_id' => $subscription->id,
                'gateway_payment_id' => $paymentId,
            ]);
        });

        if ($invoice) {
            try {
                Mail::to($invoice->user->email)->send(new ProRenewedMail($invoice, $first));
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return $invoice;
    }

    /** Auto-debit fail — `pending` (Razorpay retry karega) ya `halted` (retry khatam). Pro abhi ki expiry tak chalta hai. */
    public function paymentFailed(Subscription $subscription, array $entity, ?string $reason = null): void
    {
        $before = $subscription->status;
        $this->sync($subscription, $entity);
        $subscription->forceFill(['failure_reason' => $reason ? mb_substr($reason, 0, 255) : $subscription->failure_reason])->save();

        // har retry pe mail nahi — sirf status badalne pe
        if ($before === $subscription->status || ! in_array($subscription->status, ['pending', 'halted'], true)) {
            return;
        }

        try {
            Mail::to($subscription->user->email)->send(new ProPaymentFailedMail($subscription->user, $subscription->status === 'halted'));
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /** Auto-renew band. Active ho to mahine ke ant pe (paisa diya hua mahina chalta hai), warna turant. */
    public function cancel(User $user): Subscription
    {
        $subscription = $this->current($user);

        if (! $subscription) {
            throw ValidationException::withMessages(['plan' => 'Auto-renew is not on for your account.']);
        }

        if ($subscription->cancel_at_period_end) {
            return $subscription;
        }

        $atCycleEnd = $subscription->status === 'active';

        if (! $this->cancelAtGateway($subscription, $atCycleEnd)) {
            throw ValidationException::withMessages(['plan' => 'Razorpay could not cancel auto-renew right now. Please try again in a few minutes.']);
        }

        $subscription->forceFill(['cancel_at_period_end' => true, 'cancelled_at' => now()] + ($atCycleEnd ? [] : ['status' => 'cancelled']))->save();

        return $subscription;
    }

    /** Webhook ke `subscription.*` events. Returns webhook response ka status. */
    public function handleWebhook(string $event, array $entity, array $payment): string
    {
        $subscription = ($entity['id'] ?? null) ? Subscription::where('gateway_subscription_id', $entity['id'])->first() : null;

        if (! $subscription) {
            return 'unknown_subscription';
        }

        match ($event) {
            'subscription.charged' => $this->charged($subscription, $entity, $payment),
            'subscription.pending', 'subscription.halted' => $this->paymentFailed($subscription, $entity, $payment['error_description'] ?? null),
            // authenticated / activated / cancelled / completed / paused / resumed / updated — bas status
            default => $this->sync($subscription, $entity),
        };

        return 'ok';
    }

    /**
     * Razorpay ka subscription entity row me. Webhooks ulte kram me aa sakte hain — khatam hui subscription
     * wapas zinda nahi hoti, aur `authenticated` kabhi `active` ko peeche nahi le jaata.
     */
    private function sync(Subscription $subscription, array $entity): void
    {
        $status = $entity['status'] ?? null;
        $terminal = ['cancelled', 'completed', 'expired'];
        $fill = [];

        $allowed = in_array($status, ['created', 'authenticated', 'active', 'pending', 'halted', 'paused', ...$terminal], true)
            && ! in_array($subscription->status, $terminal, true)
            && ! (in_array($status, ['created', 'authenticated'], true) && ! in_array($subscription->status, ['created', 'authenticated', 'abandoned'], true));

        if ($allowed) {
            $fill['status'] = $status;

            if (in_array($status, $terminal, true)) {
                $fill['cancelled_at'] = $subscription->cancelled_at ?? now();
                $fill['cancel_at_period_end'] = true;
            }
        }

        if ($start = $this->time($entity['current_start'] ?? null)) {
            $fill['current_period_start'] = $start;
        }

        if ($end = $this->time($entity['current_end'] ?? null)) {
            $fill['current_period_end'] = $end;
        }

        if ($fill) {
            $subscription->forceFill($fill)->save();
        }
    }

    private function cancelAtGateway(Subscription $subscription, bool $atCycleEnd): bool
    {
        if (! $subscription->gateway_subscription_id) {
            return true;
        }

        try {
            $this->razorpay->cancelSubscription($subscription->gateway_subscription_id, $atCycleEnd);

            return true;
        } catch (RequestException|ConnectionException $e) {
            report($e);

            return false;
        }
    }

    private function time(mixed $unix): ?Carbon
    {
        return is_numeric($unix) && (int) $unix > 0 ? Carbon::createFromTimestamp((int) $unix, config('app.timezone')) : null;
    }
}
