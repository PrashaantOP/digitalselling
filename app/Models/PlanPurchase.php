<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Plus plan ki ek prepaid kharid (ya uski koshish). Paid hote hi BillingService::fulfil()
 * users.plan_expires_at aage badhata hai aur tax invoice banata hai.
 */
class PlanPurchase extends Model
{
    use HasFactory, HasUuid;

    protected $table = 'plan_purchases';

    // status / gateway ids jaan-bujhkar fillable me nahi — sirf BillingService forceFill se badalta hai
    protected $fillable = [
        'user_id',
        'plan_id',
        'months',
        'unit_price',
        'subtotal',
        'discount_amount',
        'credit_applied',
        'amount_payable',
        'gateway',
        'meta',
    ];

    protected $casts = [
        'months' => 'integer',
        'unit_price' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'credit_applied' => 'decimal:2',
        'amount_payable' => 'decimal:2',
        'period_start' => 'datetime',
        'period_end' => 'datetime',
        'paid_at' => 'datetime',
        'meta' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function plan()
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id');
    }

    public function invoice()
    {
        return $this->hasOne(BillingInvoice::class, 'plan_purchase_id');
    }
}
