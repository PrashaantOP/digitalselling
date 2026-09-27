<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Mail\SecurityNoticeMail;
use App\Models\PayoutMethod;
use App\Models\PayoutProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class PaymentAccountController extends Controller
{
    use RespondsFlexibly;

    public function edit()
    {
        $owner = \App\Support\Tenant::creator();

        return Inertia::render('Payments/Account', [
            'profile' => $owner->payoutProfile,
            'methods' => $owner->payoutMethods()->latest()->get(),
            'kycStatus' => $owner->kycVerification?->status ?? 'not_started',
        ]);
    }

    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'full_name' => ['required', 'string', 'max:150'],
            'business_name' => ['nullable', 'string', 'max:150'],
            'email' => ['nullable', 'email', 'max:150'],
            'profession' => ['nullable', 'string', 'max:100'],
        ]);

        $profile = PayoutProfile::updateOrCreate(['user_id' => $this->tid()], $data);

        return $this->done($request, 'Profile saved.', ['profile' => $profile]);
    }

    /** id bhejo to update, nahi to naya method. */
    public function updatePayoutMethod(Request $request)
    {
        $data = $request->validate([
            'id' => ['nullable', 'integer'],
            'type' => ['required', Rule::in(['upi', 'bank_transfer'])],
            'upi_id' => ['required_if:type,upi', 'nullable', 'string', 'max:100', 'regex:/^[\w.\-]{2,}@[a-zA-Z]{2,}$/'],
            'account_holder_name' => ['required_if:type,bank_transfer', 'nullable', 'string', 'max:150'],
            'account_number' => ['required_if:type,bank_transfer', 'nullable', 'string', 'max:30'],
            'ifsc' => ['required_if:type,bank_transfer', 'nullable', 'regex:/^[A-Z]{4}0[A-Z0-9]{6}$/'],
            'is_default' => ['sometimes', 'boolean'],
            // paisa kahan jayega — chori hua session akele isse badal na sake
            'current_password' => ['required', 'current_password'],
        ]);

        $destinationChanged = false;

        $method = DB::transaction(function () use ($data, &$destinationChanged) {
            $uid = $this->tid();

            $method = ! empty($data['id'])
                ? PayoutMethod::where('user_id', $uid)->findOrFail($data['id'])
                : new PayoutMethod(['user_id' => $uid]);

            $isFirst = ! PayoutMethod::where('user_id', $uid)->exists();

            $method->fill([
                'type' => $data['type'],
                'upi_id' => $data['type'] === 'upi' ? $data['upi_id'] : null,
                'account_holder_name' => $data['type'] === 'bank_transfer' ? $data['account_holder_name'] : null,
                'account_number' => $data['type'] === 'bank_transfer' ? $data['account_number'] : null,
                'ifsc' => $data['type'] === 'bank_transfer' ? $data['ifsc'] : null,
                'is_default' => ! empty($data['is_default']) || $isFirst,
            ]);

            // Verify ke baad UPI/account badal ke paisa kahin aur na bheja ja sake
            if ($method->isDirty(PayoutMethod::DESTINATION_FIELDS)) {
                $method->verified_at = null;
                $destinationChanged = true;
            }

            $method->save();

            if ($method->is_default) {
                PayoutMethod::where('user_id', $uid)->where('id', '!=', $method->id)->update(['is_default' => false]);
            }

            return $method;
        });

        if ($destinationChanged) {
            $masked = $method->type === 'upi' ? $method->upi_id : 'bank account ending ' . substr((string) $method->account_number, -4);
            SecurityNoticeMail::deliver($request->user()->email, 'payout_method_changed', $request->user()->name, $request, $masked);
        }

        return $this->done($request, 'Payout method saved.', ['method' => $method]);
    }
}
