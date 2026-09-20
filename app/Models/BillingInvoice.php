<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BillingInvoice extends Model
{
    use HasFactory;

    protected $table = 'billing_invoices';


    public $timestamps = false;


    protected $fillable = [
        'user_id',
        'subscription_id',
        'invoice_number',
        'amount',
        'status',
        'paid_at',
        'pdf_path',
        'created_at',
    ];


    protected $casts = [
        'amount' => 'decimal:2',
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
}
