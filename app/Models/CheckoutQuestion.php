<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CheckoutQuestion extends Model
{
    use HasFactory;

    protected $table = 'checkout_questions';


    protected $fillable = [
        'product_id',
        'label',
        'field_type',
        'options',
        'is_required',
        'sort_order',
    ];


    protected $casts = [
        'options' => 'array',
        'is_required' => 'boolean',
    ];


    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function answers()
    {
        return $this->hasMany(OrderCheckoutAnswer::class, 'checkout_question_id');
    }
}
