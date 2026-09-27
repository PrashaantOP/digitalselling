<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PayoutMethod;
use App\Support\AdminAudit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/** Settlement sirf verified method pe jaata hai (SettlementService) — yahan admin verify / revoke karta hai. */
class PayoutMethodController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(['unverified', 'verified', 'all'])],
            'q' => ['nullable', 'string', 'max:100'],
        ]);
        $status = $filters['status'] ?? 'unverified';

        $items = PayoutMethod::query()
            ->with(['user:id,uuid,name,email', 'user.kycVerification:id,user_id,status,legal_name,bank_account_holder'])
            ->when($status === 'unverified', fn ($q) => $q->whereNull('verified_at'))
            ->when($status === 'verified', fn ($q) => $q->whereNotNull('verified_at'))
            ->when($filters['q'] ?? null, fn ($q, $v) => $q->where(fn ($s) => $s
                ->where('upi_id', 'like', "%{$v}%")->orWhere('account_holder_name', 'like', "%{$v}%")
                ->orWhereHas('user', fn ($u) => $u->where('email', 'like', "%{$v}%")->orWhere('name', 'like', "%{$v}%"))))
            ->oldest('updated_at')
            ->paginate(25)->withQueryString()
            ->through(function (PayoutMethod $m) {
                $kyc = $m->user?->kycVerification;
                $holder = $m->type === 'upi' ? null : $m->account_holder_name;

                return [
                    'uuid' => $m->uuid,
                    'type' => $m->type,
                    // admin ko poora destination dikhna chahiye — yahi to verify ho raha hai
                    'destination' => $m->type === 'upi' ? $m->upi_id : "{$m->account_number} · {$m->ifsc}",
                    'holder' => $holder,
                    'is_default' => $m->is_default,
                    'verified_at' => $m->verified_at?->toIso8601String(),
                    'updated_at' => $m->updated_at?->toIso8601String(),
                    'creator' => $m->user?->only(['uuid', 'name', 'email']),
                    'kyc_status' => $kyc?->status ?? 'not_started',
                    'kyc_name' => $kyc?->legal_name,
                    // bank holder ka naam KYC legal name se milta hai? (sirf hint — UPI me naam nahi hota)
                    'name_matches_kyc' => $holder && $kyc?->legal_name
                        ? Str::lower(Str::squish($holder)) === Str::lower(Str::squish($kyc->legal_name))
                        : null,
                ];
            });

        return Inertia::render('Admin/PayoutMethods/Index', ['items' => $items, 'filters' => ['status' => $status, 'q' => $filters['q'] ?? null]]);
    }

    public function verify(PayoutMethod $payoutMethod): RedirectResponse
    {
        abort_if($payoutMethod->isVerified(), 422, 'This payout method is already verified.');

        $payoutMethod->markVerified();
        AdminAudit::log('payout_method.verified', $payoutMethod, ['creator_id' => $payoutMethod->user_id]);

        return back()->with('status', 'Payout method verified — settlements can go to it now.');
    }

    public function revoke(Request $request, PayoutMethod $payoutMethod): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);
        abort_unless($payoutMethod->isVerified(), 422, 'This payout method is not verified.');

        $payoutMethod->forceFill(['verified_at' => null])->save();
        AdminAudit::log('payout_method.revoked', $payoutMethod, ['creator_id' => $payoutMethod->user_id, 'reason' => $data['reason']]);

        return back()->with('status', 'Verification revoked — settlements to this method are on hold.');
    }
}
