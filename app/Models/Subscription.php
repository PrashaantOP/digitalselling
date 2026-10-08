<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Creator ka Plus auto-renew (Razorpay Subscription). Status Razorpay jaisa:
 * created → authenticated → active → (pending → halted) / cancelled / completed; `abandoned` = checkout adhoora chhoda.
 * Plus kab tak hai wo yahan nahi, `users.plan_expires_at` me — har charge use aage badhata hai (SubscriptionService).
 */
class Subscription extends Model
{
    use HasFactory, HasUuid;

    protected $table = 'subscriptions';

    /** In statuses me subscription "chal rahi" hai — naya subscribe band, cancel ka button dikhe. */
    public const LIVE = ['authenticated', 'active', 'pending', 'halted'];

    protected $fillable = [
        'user_id',
        'plan_id',
        'status',
        'gateway',
        'gateway_subscription_id',
        'current_period_start',
        'current_period_end',
        'cancelled_at',
        'cancel_at_period_end',
        'last_charged_at',
        'failure_reason',
    ];

    protected $casts = [
        'current_period_start' => 'datetime',
        'current_period_end' => 'datetime',
        'cancelled_at' => 'datetime',
        'cancel_at_period_end' => 'boolean',
        'last_charged_at' => 'datetime',
    ];

    /** Agle mahine apne aap katega? (halted me Razorpay retry band kar deta hai) */
    public function renews(): bool
    {
        return in_array($this->status, ['authenticated', 'active', 'pending'], true) && ! $this->cancel_at_period_end;
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function plan()
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id');
    }

    public function invoices()
    {
        return $this->hasMany(BillingInvoice::class, 'subscription_id');
    }
}
