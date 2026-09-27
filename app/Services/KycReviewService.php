<?php

namespace App\Services;

use App\Models\KycVerification;
use App\Support\AdminAudit;
use Illuminate\Validation\ValidationException;

/**
 * KYC approve / reject — admin panel aur `kyc:*` artisan commands dono yahi use karte hain,
 * taaki rule ek jagah rahe aur har faisla audit log me jaaye.
 */
class KycReviewService
{
    public function approve(KycVerification $kyc): KycVerification
    {
        $this->ensurePending($kyc);

        $kyc->update(['status' => 'verified', 'rejection_reason' => null, 'verified_at' => now()]);
        AdminAudit::log('kyc.approved', $kyc, ['creator_id' => $kyc->user_id]);

        return $kyc;
    }

    /** Creator ko ye reason dikhta hai aur wo details theek karke dobara submit kar sakta hai. */
    public function reject(KycVerification $kyc, string $reason): KycVerification
    {
        $this->ensurePending($kyc);

        $kyc->update(['status' => 'rejected', 'rejection_reason' => $reason, 'verified_at' => null]);
        AdminAudit::log('kyc.rejected', $kyc, ['creator_id' => $kyc->user_id, 'reason' => $reason]);

        return $kyc;
    }

    private function ensurePending(KycVerification $kyc): void
    {
        if ($kyc->status !== 'pending') {
            throw ValidationException::withMessages(['status' => "Only pending KYC can be reviewed (this one is {$kyc->status})."]);
        }
    }
}
