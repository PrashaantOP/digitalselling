<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayoutProfile extends Model
{
    use HasFactory;

    protected $table = 'payout_profiles';


    protected $fillable = [
        'user_id',
        'full_name',
        'business_name',
        'email',
        'profession',
    ];


    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
