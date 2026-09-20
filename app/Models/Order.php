<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $table = 'orders';


    protected $fillable = [
        'order_number',
        'creator_id',
        'customer_id',
        'product_id',
        'buyer_name',
        'buyer_email',
        'buyer_phone',
        'buyer_gstin',
        'buyer_state',
        'coupon_id',
        'base_amount',
        'discount_amount',
        'addon_amount',
        'total_amount',
        'commission_rate',
        'platform_fee',
        'net_payout_amount',
        'payment_gateway',
        'gateway_order_id',
        'gateway_payment_id',
        'status',
        'paid_at',
    ];


    protected $casts = [
        'base_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'addon_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'commission_rate' => 'decimal:2',
        'platform_fee' => 'decimal:2',
        'net_payout_amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];


    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function coupon()
    {
        return $this->belongsTo(Coupon::class, 'coupon_id');
    }

    public function addonItems()
    {
        return $this->hasMany(OrderAddonItem::class, 'order_id');
    }

    public function checkoutAnswers()
    {
        return $this->hasMany(OrderCheckoutAnswer::class, 'order_id');
    }

    public function enrollment()
    {
        return $this->hasOne(Enrollment::class, 'order_id');
    }

    public function eventRegistration()
    {
        return $this->hasOne(EventRegistration::class, 'order_id');
    }

    public function booking()
    {
        return $this->hasOne(Booking::class, 'order_id');
    }

    public function bookDownloads()
    {
        return $this->hasMany(BookDownload::class, 'order_id');
    }

    public function lockedContentUnlocks()
    {
        return $this->hasMany(LockedContentUnlock::class, 'order_id');
    }
}
