<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentPageDetail extends Model
{
    use HasFactory;

    protected $table = 'payment_page_details';


    protected $fillable = [
        'product_id',
        'subtitle',
        'whats_included',
        'faqs',
        'collect_full_name',
        'collect_note',
    ];


    protected $casts = [
        'whats_included' => 'array',
        'faqs' => 'array',
        'collect_full_name' => 'boolean',
        'collect_note' => 'boolean',
    ];


    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
