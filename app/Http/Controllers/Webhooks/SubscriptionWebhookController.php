<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Models\BillingInvoice;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\RazorpayService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/** POST /webhooks/razorpay-subscription — creator ke SaaS plan (Free → Pro) ki billing. */
class SubscriptionWebhookController extends Controller
{
    public function handle(Request $request, RazorpayService $razorpay)
    {
        $secret = (string) (config('services.razorpay.subscription_webhook_secret') ?: config('services.razorpay.webhook_secret'));

        abort_unless($razorpay->validSignature($request->getContent(), $request->header('X-Razorpay-Signature'), $secret), 400, 'Invalid signature');

        $event = $request->input('event');
        $sub = $request->input('payload.subscription.entity', []);
        $notes = $sub['notes'] ?? [];

        $user = User::find($notes['user_id'] ?? null);
        $plan = SubscriptionPlan::where('slug', $notes['plan_slug'] ?? '')->first();

        if (! $user || ! $plan || empty($sub['id'])) {
            return response()->json(['status' => 'ignored']);
        }

        $subscription = Subscription::firstOrNew(['user_id' => $user->id, 'gateway_subscription_id' => $sub['id']]);
        $subscription->plan_id = $plan->id;
        $subscription->gateway = 'razorpay';

        switch ($event) {
            case 'subscription.activated':
            case 'subscription.charged':
                $subscription->status = 'active';
                $subscription->current_period_start = isset($sub['current_start']) ? Carbon::createFromTimestamp($sub['current_start'])->toDateString() : null;
                $subscription->current_period_end = isset($sub['current_end']) ? Carbon::createFromTimestamp($sub['current_end'])->toDateString() : null;
                $subscription->cancelled_at = null;
                $subscription->save();

                // users.plan enum ('free','pro') — paid plan = pro
                $user->update(['plan' => $plan->slug === 'free' ? 'free' : 'pro']);

                if ($event === 'subscription.charged' && ($payment = $request->input('payload.payment.entity'))) {
                    BillingInvoice::firstOrCreate(
                        ['invoice_number' => 'INV-' . strtoupper($payment['id'])],
                        [
                            'user_id' => $user->id,
                            'subscription_id' => $subscription->id,
                            'amount' => ($payment['amount'] ?? 0) / 100,
                            'status' => 'paid',
                            'paid_at' => now(),
                        ]
                    );
                }
                break;

            case 'subscription.halted':
            case 'subscription.pending':
                $subscription->status = 'past_due';
                $subscription->save();
                break;

            case 'subscription.cancelled':
            case 'subscription.completed':
                $subscription->status = 'cancelled';
                $subscription->cancelled_at = now();
                $subscription->save();

                $user->update(['plan' => 'free']);
                break;
        }

        return response()->json(['status' => 'ok']);
    }
}
