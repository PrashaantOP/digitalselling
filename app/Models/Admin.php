<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * Platform admin — `admin` guard, `admins` table. Creators (`users`) se koi rishta nahi, isliye creator
 * side ka koi bhi bug (mass assignment, session) admin access nahi de sakta.
 */
class Admin extends Authenticatable
{
    use HasUuid, Notifiable;

    protected $table = 'admins';

    // password / is_active / last_login_* sirf forceFill se (artisan + login flow)
    protected $fillable = ['name', 'email'];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'password' => 'hashed',
        'is_active' => 'boolean',
        'last_login_at' => 'datetime',
    ];

    /** Remember-me admin ke liye band hai — column bhi nahi. */
    public function getRememberTokenName()
    {
        return '';
    }
}
