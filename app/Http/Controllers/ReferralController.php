<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\ReferralCredit;
use App\Services\ReferralService;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Dashboard → Refer & Earn.
 * Credit sirf Plus subscription me lagta hai — withdraw ka yahan koi raasta hai hi nahi.
 */
class ReferralController extends Controller
{
    use RespondsFlexibly;

    public function __construct(private ReferralService $referrals) {}

    public function index()
    {
        // referral personal hai — Tenant nahi, apna hi code
        $user = auth()->user();
        $code = $this->referrals->codeFor($user);
        $balance = $this->referrals->balanceFor($user);

        $referrals = $user->referralsMade()->with('referredUser:id,name,avatar')->latest('joined_at')->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'name' => $r->referredUser?->name ?? 'Creator',
                'avatar' => $r->referredUser?->avatar,
                'status' => $r->status,
                'earned' => (float) $r->total_earnings,
                'joined_at' => $r->joined_at,
                'rewarded_at' => $r->rewarded_at,
            ]);

        return Inertia::render('Referral/Index', [
            'code' => $code->code,
            'link' => url('/register?ref=' . $code->code),
            'reward' => ReferralService::REWARD,
            'balance' => $balance,
            'blockedReason' => $this->referrals->blockedReason($user),
            'planExpiresAt' => $user->plan_expires_at,
            'stats' => [
                'total' => $referrals->count(),
                'active' => $referrals->whereIn('status', ['active', 'earning'])->count(),
                // status nahi, rewarded_at — yahi ledger ke saath hamesha match karta hai
                'rewarded' => $referrals->whereNotNull('rewarded_at')->count(),
            ],
            'referrals' => $referrals,
            'ledger' => ReferralCredit::where('user_id', $user->id)->latest('id')->limit(20)->get(['id', 'type', 'amount', 'description', 'created_at']),
        ]);
    }

    /** Credit → Plus mahine. Balance kam ho ya paid subscription chal rahi ho to service hi rok deti hai. */
    public function redeem(Request $request)
    {
        $data = $request->validate(['months' => ['required', 'integer', 'min:1', 'max:24']]);

        $credit = $this->referrals->redeem($request->user(), $data['months']);

        return $this->done($request, $credit->description . ' added to your account.', ['credit' => $credit]);
    }
}
