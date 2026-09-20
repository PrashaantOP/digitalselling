<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SubscriptionPlan extends Model
{
    use HasFactory;

    protected $table = 'subscription_plans';


    protected $fillable = [
        'name',
        'slug',
        'monthly_price',
        'commission_rate',
        'features',
        'is_active',
    ];


    protected $casts = [
        'monthly_price' => 'decimal:2',
        'commission_rate' => 'decimal:2',
        'features' => 'array',
        'is_active' => 'boolean',
    ];


    public function subscriptions()
    {
        return $this->hasMany(Subscription::class, 'plan_id');
    }
}
