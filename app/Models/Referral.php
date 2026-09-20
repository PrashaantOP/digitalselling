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
        'joined_at',
    ];


    protected $casts = [
        'total_earnings' => 'decimal:2',
        'joined_at' => 'datetime',
    ];


    public function referrer()
    {
        return $this->belongsTo(User::class, 'referrer_id');
    }

    public function referredUser()
    {
        return $this->belongsTo(User::class, 'referred_user_id');
    }
}
