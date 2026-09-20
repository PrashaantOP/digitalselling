<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderCheckoutAnswer extends Model
{
    use HasFactory;

    protected $table = 'order_checkout_answers';


    protected $fillable = [
        'order_id',
        'checkout_question_id',
        'answer',
    ];


    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function question()
    {
        return $this->belongsTo(CheckoutQuestion::class, 'checkout_question_id');
    }
}
