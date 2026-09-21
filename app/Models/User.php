<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasFactory, Notifiable, SoftDeletes, HasRoles;

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'country_code',
        'username',
        'avatar',
        'role',
        'parent_creator_id',
        'plan',
        'status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'phone_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    // ---- account-type helpers (coarse-level, see role column notes) ----
    public function isCreator(): bool
    {
        return $this->role === 'creator';
    }

    public function isSubAdmin(): bool
    {
        return $this->role === 'sub_admin';
    }

    public function isCustomer(): bool
    {
        return $this->role === 'customer';
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public static function uniqueUsername(string $name, ?int $ignoreId = null): string
    {
        $base = Str::lower(Str::slug($name)) ?: 'creator';
        $base = Str::limit($base, 24, '');
        if (in_array($base, ['dashboard', 'login', 'register', 'logout', 'settings', 'checkout', 'admin', 'api', 'storage'], true)) {
            $base .= '-creator';
        }
        $username = $base;
        $suffix = 1;

        while (self::where('username', $username)->when($ignoreId, fn($q) => $q->whereKeyNot($ignoreId))->exists()) {
            $username = Str::limit($base, 24, '') . '-' . $suffix++;
        }

        return $username;
    }

    // ---- relationships ----

    /** The creator this sub-admin belongs to (denormalized, set on invite-accept) */
    public function parentCreator()
    {
        return $this->belongsTo(User::class, 'parent_creator_id');
    }

    /** Sub-admins invited by this creator (accepted accounts only, via parent_creator_id) */
    public function subAdminUsers()
    {
        return $this->hasMany(User::class, 'parent_creator_id');
    }

    /** Full invite history (invited/active/revoked) this creator has sent */
    public function subAdminInvites()
    {
        return $this->hasMany(SubAdmin::class, 'creator_id');
    }

    public function store()
    {
        return $this->hasOne(Store::class, 'user_id');
    }

    public function subscription()
    {
        return $this->hasOne(Subscription::class, 'user_id')->latestOfMany();
    }

    public function billingInvoices()
    {
        return $this->hasMany(BillingInvoice::class, 'user_id');
    }

    public function notificationPreference()
    {
        return $this->hasOne(NotificationPreference::class, 'user_id');
    }

    public function payoutProfile()
    {
        return $this->hasOne(PayoutProfile::class, 'user_id');
    }

    public function payoutMethods()
    {
        return $this->hasMany(PayoutMethod::class, 'user_id');
    }

    public function kycVerification()
    {
        return $this->hasOne(KycVerification::class, 'user_id');
    }

    public function payouts()
    {
        return $this->hasMany(Payout::class, 'user_id');
    }

    public function customers()
    {
        return $this->hasMany(Customer::class, 'creator_id');
    }

    public function referralCode()
    {
        return $this->hasOne(ReferralCode::class, 'user_id');
    }

    public function referralsMade()
    {
        return $this->hasMany(Referral::class, 'referrer_id');
    }

    public function referredBy()
    {
        return $this->hasOne(Referral::class, 'referred_user_id');
    }

    public function products()
    {
        return $this->hasMany(Product::class, 'creator_id');
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'creator_id');
    }

    public function availabilities()
    {
        return $this->hasMany(CreatorAvailability::class, 'user_id');
    }

    public function availabilityExceptions()
    {
        return $this->hasMany(AvailabilityException::class, 'user_id');
    }

    public function bookingsAsCreator()
    {
        return $this->hasMany(Booking::class, 'creator_id');
    }

    public function autodmRules()
    {
        return $this->hasMany(AutodmRule::class, 'user_id');
    }
}
