<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayoutMethod extends Model
{
    use HasFactory, HasUuid;

    protected $table = 'payout_methods';

    /** Paisa kahan jayega — inme se kuch bhi badle to method dobara verify hona chahiye. */
    public const DESTINATION_FIELDS = ['type', 'upi_id', 'account_holder_name', 'account_number', 'ifsc'];

    // verified_at jaan-bujhkar fillable me nahi hai — sirf markVerified() se set hota hai
    protected $fillable = [
        'user_id',
        'type',
        'upi_id',
        'account_holder_name',
        'account_number',
        'ifsc',
        'is_default',
    ];


    protected $casts = [
        'is_default' => 'boolean',
        'verified_at' => 'datetime',
    ];

    public function isVerified(): bool
    {
        return $this->verified_at !== null;
    }

    public function markVerified(): void
    {
        $this->forceFill(['verified_at' => now()])->save();
    }


    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function settlements()
    {
        return $this->hasMany(Settlement::class, 'payout_method_id');
    }
}
