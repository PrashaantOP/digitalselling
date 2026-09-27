<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\SecurityNoticeMail;
use App\Models\User;
use App\Support\AdminAudit;
use App\Support\PlanPricing;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CreatorController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'plan' => ['nullable', Rule::in(['free', 'pro'])],
            'status' => ['nullable', Rule::in(['active', 'suspended'])],
            'kyc' => ['nullable', Rule::in(['not_started', 'pending', 'verified', 'rejected'])],
        ]);

        $creators = User::query()
            ->where('role', 'creator')
            ->with('kycVerification:id,user_id,status')
            ->withSum(['orders as gross' => fn ($q) => $q->where('status', 'success')], 'total_amount')
            ->when($filters['q'] ?? null, fn ($q, $v) => $q->where(fn ($s) => $s
                ->where('name', 'like', "%{$v}%")->orWhere('email', 'like', "%{$v}%")
                ->orWhere('username', 'like', "%{$v}%")->orWhere('phone', 'like', "%{$v}%")))
            ->when($filters['plan'] ?? null, fn ($q, $v) => $q->where('plan', $v))
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($filters['kyc'] ?? null, fn ($q, $v) => $v === 'not_started'
                ? $q->where(fn ($s) => $s->doesntHave('kycVerification')->orWhereHas('kycVerification', fn ($k) => $k->where('status', 'not_started')))
                : $q->whereHas('kycVerification', fn ($k) => $k->where('status', $v)))
            ->latest()
            ->paginate(25)->withQueryString()
            ->through(fn (User $u) => [
                'uuid' => $u->uuid,
                'name' => $u->name,
                'email' => $u->email,
                'username' => $u->username,
                'plan' => PlanPricing::effectivePlan($u),
                'status' => $u->status,
                'kyc_status' => $u->kycVerification?->status ?? 'not_started',
                'gross' => (float) ($u->gross ?? 0),
                'joined_at' => $u->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Admin/Creators/Index', ['creators' => $creators, 'filters' => $filters]);
    }

    public function show(User $creator)
    {
        $creator->load(['kycVerification', 'payoutMethods', 'payoutProfile']);
        $paid = $creator->orders()->where('status', 'success');

        return Inertia::render('Admin/Creators/Show', [
            'creator' => [
                'uuid' => $creator->uuid,
                'name' => $creator->name,
                'email' => $creator->email,
                'phone' => $creator->phone,
                'username' => $creator->username,
                'plan' => $creator->plan,
                'effective_plan' => PlanPricing::effectivePlan($creator),
                'plan_expires_at' => $creator->plan_expires_at?->toIso8601String(),
                'commission_rate' => PlanPricing::commissionRate($creator),
                'status' => $creator->status,
                'two_factor_enabled' => (bool) $creator->two_factor_enabled,
                'email_verified' => $creator->email_verified_at !== null,
                'joined_at' => $creator->created_at?->toIso8601String(),
                'business_name' => $creator->payoutProfile?->business_name,
            ],
            'kyc' => $creator->kycVerification ? $creator->kycVerification->only(['uuid', 'status', 'legal_name', 'submitted_at', 'verified_at', 'rejection_reason']) : null,
            'payoutMethods' => $creator->payoutMethods->map(fn ($m) => [
                'uuid' => $m->uuid,
                'type' => $m->type,
                'destination' => $m->type === 'upi' ? $m->upi_id : '•••• ' . substr((string) $m->account_number, -4) . ' · ' . $m->ifsc,
                'holder' => $m->account_holder_name,
                'is_default' => $m->is_default,
                'verified_at' => $m->verified_at?->toIso8601String(),
            ]),
            'totals' => [
                'orders' => (clone $paid)->count(),
                'gross' => (float) (clone $paid)->sum('total_amount'),
                'commission' => (float) (clone $paid)->sum('platform_fee'),
                'net' => (float) (clone $paid)->sum('net_payout_amount'),
                'settled' => (float) $creator->settlements()->where('status', 'paid')->sum('net_amount'),
            ],
            'recentOrders' => $creator->orders()->with('product:id,title')->latest()->limit(10)->get()
                ->map(fn ($o) => [
                    'uuid' => $o->uuid, 'order_number' => $o->order_number, 'product' => $o->product?->title,
                    'total_amount' => (float) $o->total_amount, 'status' => $o->status, 'created_at' => $o->created_at?->toIso8601String(),
                ]),
            'recentSettlements' => $creator->settlements()->latest('id')->limit(10)->get()
                ->map(fn ($s) => $s->only(['uuid', 'number', 'net_amount', 'status', 'reference_number']) + ['created_at' => $s->created_at?->toIso8601String()]),
        ]);
    }

    /** Store band + saare chalu sessions (creator + uske sub-admins) turant khatam. */
    public function suspend(Request $request, User $creator): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:500']]);

        abort_if($creator->status === 'suspended', 422, 'This creator is already suspended.');

        DB::transaction(function () use ($creator) {
            $creator->forceFill(['status' => 'suspended'])->save();

            $userIds = User::where('parent_creator_id', $creator->id)->pluck('id')->push($creator->id);
            DB::table('sessions')->whereIn('user_id', $userIds)->delete();
        });

        AdminAudit::log('creator.suspended', $creator, ['reason' => $data['reason']]);

        return back()->with('status', 'Creator suspended and signed out everywhere.');
    }

    public function activate(User $creator): RedirectResponse
    {
        abort_if($creator->status === 'active', 422, 'This creator is already active.');

        $creator->forceFill(['status' => 'active'])->save();
        AdminAudit::log('creator.activated', $creator);

        return back()->with('status', 'Creator re-activated.');
    }

    /**
     * Creator ka email access chala gaya aur 2FA ki wajah se login nahi ho raha — support identity check
     * karke hi ye kare (reason audit me). Creator ko alert jaata hai.
     */
    public function resetTwoFactor(Request $request, User $creator): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:500']]);
        abort_unless($creator->two_factor_enabled, 422, 'Two-step verification is not on for this creator.');

        $creator->forceFill(['two_factor_enabled' => false])->save();
        AdminAudit::log('creator.two_factor_reset', $creator, ['reason' => $data['reason']]);
        SecurityNoticeMail::deliver($creator->email, 'two_factor_reset', $creator->name, $request);

        return back()->with('status', 'Two-step verification turned off for this creator.');
    }

    public function updatePlan(Request $request, User $creator): RedirectResponse
    {
        $data = $request->validate([
            'plan' => ['required', Rule::in(['free', 'pro'])],
            'plan_expires_at' => ['nullable', 'date', 'after:today'],
        ]);

        $before = $creator->only(['plan', 'plan_expires_at']);
        $creator->forceFill([
            'plan' => $data['plan'],
            'plan_expires_at' => $data['plan'] === 'pro' ? ($data['plan_expires_at'] ?? null) : null,
        ])->save();

        AdminAudit::log('creator.plan_changed', $creator, [
            'from' => ['plan' => $before['plan'], 'expires' => $before['plan_expires_at']?->toDateString()],
            'to' => ['plan' => $creator->plan, 'expires' => $creator->plan_expires_at?->toDateString()],
        ]);

        return back()->with('status', 'Plan updated.');
    }
}
