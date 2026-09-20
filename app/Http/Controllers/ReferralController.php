<?php

namespace App\Http\Controllers;

use App\Models\ReferralCode;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ReferralController extends Controller
{
    public function index()
    {
        // referral personal hai — sub-admin ho ya creator, apna hi code (Tenant nahi)
        $user = auth()->user();

        $code = ReferralCode::firstOrCreate(['user_id' => $user->id], ['code' => $this->uniqueCode()]);

        $referrals = $user->referralsMade()->with('referredUser:id,name,avatar')->latest('joined_at')->get();

        return Inertia::render('Referral/Index', [
            'code' => $code->code,
            'link' => url('/register?ref=' . $code->code),
            'stats' => [
                'total' => $referrals->count(),
                'active' => $referrals->whereIn('status', ['active', 'earning'])->count(),
                'earnings' => (float) $referrals->sum('total_earnings'),
            ],
            'referrals' => $referrals,
        ]);
    }

    private function uniqueCode(): string
    {
        do {
            $code = Str::upper(Str::random(8));
        } while (ReferralCode::where('code', $code)->exists());

        return $code;
    }
}
