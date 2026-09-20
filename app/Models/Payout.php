<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payout extends Model
{
    use HasFactory;

    protected $table = 'payouts';


    protected $fillable = [
        'user_id',
        'payout_method_id',
        'amount',
        'status',
        'reference_number',
        'notes',
        'requested_at',
        'processed_at',
    ];


    protected $casts = [
        'amount' => 'decimal:2',
        'requested_at' => 'datetime',
        'processed_at' => 'datetime',
    ];


    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function payoutMethod()
    {
        return $this->belongsTo(PayoutMethod::class, 'payout_method_id');
    }
}
