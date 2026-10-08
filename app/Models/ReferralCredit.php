<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Referral credit ledger ki ek line — ya to reward mila (ReferralService::REWARD) (`earned`), ya Plus me laga (`redeemed`).
 * Balance kahin store nahi hota, inhi rows se nikalta hai.
 */
class ReferralCredit extends Model
{
    use HasFactory;

    protected $table = 'referral_credits';

    protected $fillable = [
        'user_id',
        'referral_id',
        'type',
        'amount',
        'description',
        'meta',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'meta' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function referral()
    {
        return $this->belongsTo(Referral::class, 'referral_id');
    }
}
