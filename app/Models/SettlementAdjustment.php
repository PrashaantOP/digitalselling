<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Creator ke payout me ek +/− line jo kisi order se nahi aati (refund wapas lena, manual correction).
 * `amount` signed hai. `settlement_id` null = agli settlement cycle me lagega.
 */
class SettlementAdjustment extends Model
{
    use HasFactory, HasUuid;

    protected $table = 'settlement_adjustments';

    public const TYPE_LABELS = [
        'refund_reversal' => 'Refund recovered',
        'manual_debit' => 'Debit',
        'manual_credit' => 'Credit',
    ];

    protected $fillable = [
        'creator_id',
        'order_id',
        'settlement_id',
        'type',
        'amount',
        'reason',
        'admin_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function settlement()
    {
        return $this->belongsTo(Settlement::class, 'settlement_id');
    }
}
