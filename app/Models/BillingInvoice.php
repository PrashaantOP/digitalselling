<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Creator ko platform ka tax invoice (Pro plan). `amount` GST-inclusive total hai;
 * taxable + CGST/SGST/IGST uska breakup. Buyer/seller details snapshot hain.
 */
class BillingInvoice extends Model
{
    use HasFactory, HasUuid;

    protected $table = 'billing_invoices';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'subscription_id',
        'plan_purchase_id',
        'gateway_payment_id',
        'invoice_number',
        'amount',
        'taxable_amount',
        'gst_rate',
        'cgst_amount',
        'sgst_amount',
        'igst_amount',
        'credit_applied',
        'sac_code',
        'description',
        'billing_name',
        'billing_email',
        'billing_gstin',
        'billing_state',
        'seller',
        'period_start',
        'period_end',
        'status',
        'paid_at',
        'pdf_path',
        'created_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'taxable_amount' => 'decimal:2',
        'gst_rate' => 'decimal:2',
        'cgst_amount' => 'decimal:2',
        'sgst_amount' => 'decimal:2',
        'igst_amount' => 'decimal:2',
        'credit_applied' => 'decimal:2',
        'seller' => 'array',
        'period_start' => 'datetime',
        'period_end' => 'datetime',
        'paid_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function subscription()
    {
        return $this->belongsTo(Subscription::class, 'subscription_id');
    }

    public function purchase()
    {
        return $this->belongsTo(PlanPurchase::class, 'plan_purchase_id');
    }
}
