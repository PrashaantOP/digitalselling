<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    use HasFactory;

    protected $table = 'coupons';


    protected $fillable = [
        'product_id',
        'code',
        'discount_percent',
        'usage_limit',
        'used_count',
        'expires_at',
        'is_active',
    ];


    protected $casts = [
        'discount_percent' => 'decimal:2',
        'expires_at' => 'datetime',
        'is_active' => 'boolean',
    ];


    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'coupon_id');
    }
}
