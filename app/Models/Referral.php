<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Referral extends Model
{
    use HasFactory;

    protected $table = 'referrals';


    protected $fillable = [
        'referrer_id',
        'referred_user_id',
        'status',
        'total_earnings',
        'rewarded_at',
        'joined_at',
    ];


    protected $casts = [
        'total_earnings' => 'decimal:2',
        'rewarded_at' => 'datetime',
        'joined_at' => 'datetime',
    ];


    /** Reward mil chuka hai ya nahi. */
    public function isRewarded(): bool
    {
        return $this->rewarded_at !== null;
    }


    public function referrer()
    {
        return $this->belongsTo(User::class, 'referrer_id');
    }

    public function referredUser()
    {
        return $this->belongsTo(User::class, 'referred_user_id');
    }
}
