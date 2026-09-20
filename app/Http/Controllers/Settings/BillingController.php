<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Http\Controllers\Controller;
use App\Models\BillingInvoice;
use App\Models\SubscriptionPlan;
use App\Services\RazorpayService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class BillingController extends Controller
{
    use RespondsFlexibly;

    public function edit()
    {
        $user = auth()->user();

        return Inertia::render('settings/billing', [
            'currentPlan' => $user->plan,
            'subscription' => $user->subscription?->load('plan'),
            'plans' => SubscriptionPlan::where('is_active', true)->orderBy('monthly_price')->get(),
            'invoices' => BillingInvoice::where('user_id', $user->id)->latest('created_at')->limit(24)->get(),
        ]);
    }

    /**
     * Razorpay subscription create karta hai aur frontend ko checkout payload deta hai.
     * Plan tabhi activate hota hai jab SubscriptionWebhookController ko `subscription.activated` milta hai.
     * Config: services.razorpay.plans.{slug} = Razorpay dashboard ka plan_id.
     */
    public function upgrade(Request $request, RazorpayService $razorpay)
    {
        $data = $request->validate(['plan' => ['required', 'string', 'exists:subscription_plans,slug']]);

        $plan = SubscriptionPlan::where('slug', $data['plan'])->where('is_active', true)->firstOrFail();
        $gatewayPlanId = config("services.razorpay.plans.{$plan->slug}");

        if ((float) $plan->monthly_price <= 0 || ! $gatewayPlanId) {
            throw ValidationException::withMessages(['plan' => 'This plan is not available for purchase.']);
        }

        if ($request->user()->plan === $plan->slug) {
            throw ValidationException::withMessages(['plan' => 'You are already on this plan.']);
        }

        $subscription = $razorpay->createSubscription($gatewayPlanId, 120, [
            'user_id' => (string) $request->user()->id,
            'plan_slug' => $plan->slug,
        ]);

        return response()->json([
            'razorpay_key' => $razorpay->keyId(),
            'subscription_id' => $subscription['id'],
            'plan' => $plan->only(['name', 'slug', 'monthly_price']),
        ]);
    }
}
