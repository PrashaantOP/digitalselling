<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Kabhi bhi route me nahi jaata — isliye uuid nahi. Code plain text me kabhi store nahi hota. */
class LoginOtp extends Model
{
    protected $table = 'login_otps';

    protected $fillable = ['purpose', 'code_hash', 'expires_at', 'ip', 'user_agent'];

    protected $hidden = ['code_hash'];

    protected $casts = [
        'attempts' => 'integer',
        'expires_at' => 'datetime',
        'consumed_at' => 'datetime',
    ];

    public function authenticatable()
    {
        return $this->morphTo();
    }
}
