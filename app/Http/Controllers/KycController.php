<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesUploads;
use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\KycVerification;
use Illuminate\Http\Request;
use Inertia\Inertia;

class KycController extends Controller
{
    use RespondsFlexibly, HandlesUploads;

    public function edit()
    {
        $kyc = KycVerification::where('user_id', $this->tid())->first();

        return Inertia::render('Payments/Kyc', [
            // sensitive fields frontend ko mask karke bhejte hain
            'kyc' => $kyc ? [
                'status' => $kyc->status,
                'legal_name' => $kyc->legal_name,
                'pan_number' => $this->mask($kyc->pan_number),
                'gst_number' => $kyc->gst_number,
                'bank_account_holder' => $kyc->bank_account_holder,
                'bank_account_number' => $this->mask($kyc->bank_account_number),
                'ifsc' => $kyc->ifsc,
                'has_document' => (bool) $kyc->id_document_path,
                'rejection_reason' => $kyc->rejection_reason,
                'submitted_at' => $kyc->submitted_at,
                'verified_at' => $kyc->verified_at,
            ] : ['status' => 'not_started'],
        ]);
    }

    public function submit(Request $request)
    {
        $existing = KycVerification::where('user_id', $this->tid())->first();

        abort_if(in_array($existing?->status, ['pending', 'verified'], true), 422, 'KYC is already ' . $existing?->status . '.');

        $data = $request->validate([
            'legal_name' => ['required', 'string', 'max:150'],
            'pan_number' => ['required', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]$/'],
            'gst_number' => ['nullable', 'regex:/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/'],
            'bank_account_holder' => ['required', 'string', 'max:150'],
            'bank_account_number' => ['required', 'digits_between:6,20'],
            'ifsc' => ['required', 'regex:/^[A-Z]{4}0[A-Z0-9]{6}$/'],
            'id_document' => [$existing?->id_document_path ? 'nullable' : 'required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        if ($request->hasFile('id_document')) {
            $this->deletePrivate($existing?->id_document_path);
            $data['id_document_path'] = $this->putPrivate($request->file('id_document'), 'kyc');
        }
        unset($data['id_document']);

        $kyc = KycVerification::updateOrCreate(['user_id' => $this->tid()], $data + [
            'status' => 'pending',
            'rejection_reason' => null,
            'submitted_at' => now(),
        ]);

        return $this->done($request, 'KYC submitted for review.', ['status' => $kyc->status]);
    }

    private function mask(?string $v): ?string
    {
        return $v ? str_repeat('•', max(strlen($v) - 4, 0)) . substr($v, -4) : null;
    }
}
