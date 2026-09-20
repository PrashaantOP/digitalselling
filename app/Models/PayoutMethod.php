<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayoutMethod extends Model
{
    use HasFactory;

    protected $table = 'payout_methods';


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
    ];


    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function payouts()
    {
        return $this->hasMany(Payout::class, 'payout_method_id');
    }
}
