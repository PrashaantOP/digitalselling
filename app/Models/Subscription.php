<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    use HasFactory;

    protected $table = 'subscriptions';


    protected $fillable = [
        'user_id',
        'plan_id',
        'status',
        'gateway',
        'gateway_subscription_id',
        'current_period_start',
        'current_period_end',
        'cancelled_at',
    ];


    protected $casts = [
        'current_period_start' => 'date',
        'current_period_end' => 'date',
        'cancelled_at' => 'datetime',
    ];


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
