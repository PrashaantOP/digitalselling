<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SubAdmin extends Model
{
    use HasFactory, HasUuid;

    protected $table = 'sub_admins';

    public const INVITE_DAYS = 7;

    // invite_token_hash / invite_expires_at sirf issueInvite() se — request se kabhi nahi
    protected $fillable = [
        'creator_id',
        'user_id',
        'email',
        'status',
        'role_name',
        'invited_at',
        'accepted_at',
    ];

    protected $hidden = ['invite_token_hash'];

    protected $casts = [
        'invited_at' => 'datetime',
        'invite_expires_at' => 'datetime',
        'accepted_at' => 'datetime',
    ];

    /**
     * Naya invite link. Raw token sirf email me jaata hai; DB me uska sha256 — DB leak ho to bhi
     * koi invite accept nahi kar sakta. Purana link isi waqt bekaar.
     */
    public function issueInvite(): string
    {
        $token = Str::random(64);

        $this->forceFill([
            'invite_token_hash' => hash('sha256', $token),
            'invite_expires_at' => now()->addDays(self::INVITE_DAYS),
            'invited_at' => now(),
        ])->save();

        return $token;
    }

    /** Link wala pending invite (expire na hua ho). */
    public static function findPendingByToken(string $token): ?self
    {
        return static::query()
            ->where('invite_token_hash', hash('sha256', $token))
            ->where('status', 'invited')
            ->where('invite_expires_at', '>', now())
            ->first();
    }

    public function scopeLive(Builder $query): Builder
    {
        return $query->whereIn('status', ['invited', 'active']);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
