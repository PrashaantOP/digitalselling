<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Ek batch payout. Creator ise request nahi karta — SettlementService roz eligible
 * orders ko group karke banata hai. Amounts snapshot hain; line-by-line breakdown
 * orders() relation se aata hai.
 */
class Settlement extends Model
{
    use HasFactory;

    protected $table = 'settlements';

    /** URL me id ki jagah number (STL-…) — guess karke dusre ka settlement nahi khula ja sakta. */
    public function getRouteKeyName(): string
    {
        return 'number';
    }

    protected $fillable = [
        'number',
        'creator_id',
        'payout_method_id',
        'orders_count',
        'gross_amount',
        'commission_amount',
        'net_amount',
        'period_start',
        'period_end',
        'status',
        'reference_number',
        'failure_reason',
        'notes',
        'processed_at',
    ];

    protected $casts = [
        'gross_amount' => 'decimal:2',
        'commission_amount' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'period_start' => 'datetime',
        'period_end' => 'datetime',
        'processed_at' => 'datetime',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function payoutMethod()
    {
        return $this->belongsTo(PayoutMethod::class, 'payout_method_id');
    }

    /** Is settlement me kaun kaun si bookings/sales thi. */
    public function orders()
    {
        return $this->hasMany(Order::class, 'settlement_id');
    }
}
