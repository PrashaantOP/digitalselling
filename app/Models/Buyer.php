<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Foundation\Auth\User as Authenticatable;

/**
 * Kharidne wala insaan — `customer` guard, `buyers` table. Password nahi hota: login OTP se
 * (email hamesha, mobile sirf verified phone pe). Har creator ka `customers` row isi se juda hai.
 * `users` (creators) se koi rishta nahi.
 */
class Buyer extends Authenticatable
{
    use HasUuid;

    protected $table = 'buyers';

    // *_verified_at aur last_login_at sirf login/verify flow se (forceFill)
    protected $fillable = ['email', 'name', 'phone'];

    protected $hidden = ['remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'phone_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
    ];

    /** Is insaan ki har creator wali CRM row. */
    public function customers()
    {
        return $this->hasMany(Customer::class, 'buyer_id');
    }

    public function phoneVerified(): bool
    {
        return $this->phone !== null && $this->phone_verified_at !== null;
    }

    /** Abhi tak na email verify hua na phone — account ka koi maalik saabit nahi. */
    public function unverified(): bool
    {
        return $this->email_verified_at === null && $this->phone_verified_at === null;
    }
}
