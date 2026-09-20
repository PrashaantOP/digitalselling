<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'products';


    protected $fillable = [
        'creator_id',
        'type',
        'title',
        'slug',
        'status',
        'cover_type',
        'cover_video_url',
        'description',
        'pricing_type',
        'price',
        'has_discount',
        'discounted_price',
        'button_text',
        'theme',
        'accent_color',
        'post_purchase_message',
        'terms_and_conditions',
        'refund_policy',
        'privacy_policy',
        'fb_pixel_id',
        'ga_tracking_id',
        'sales_count',
        'revenue_total',
        'views_count',
        'published_at',
    ];


    protected $casts = [
        'price' => 'decimal:2',
        'has_discount' => 'boolean',
        'discounted_price' => 'decimal:2',
        'revenue_total' => 'decimal:2',
        'published_at' => 'datetime',
    ];


    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function coverImages()
    {
        return $this->hasMany(ProductCoverImage::class, 'product_id');
    }

    public function coupons()
    {
        return $this->hasMany(Coupon::class, 'product_id');
    }

    public function checkoutQuestions()
    {
        return $this->hasMany(CheckoutQuestion::class, 'product_id');
    }

    public function addons()
    {
        return $this->hasMany(ProductAddon::class, 'product_id');
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'product_id');
    }

    public function courseDetail()
    {
        return $this->hasOne(CourseDetail::class, 'product_id');
    }

    public function eventDetail()
    {
        return $this->hasOne(EventDetail::class, 'product_id');
    }

    public function bookDetail()
    {
        return $this->hasOne(BookDetail::class, 'product_id');
    }

    public function lockedContentDetail()
    {
        return $this->hasOne(LockedContentDetail::class, 'product_id');
    }

    public function bookingServiceDetail()
    {
        return $this->hasOne(BookingServiceDetail::class, 'product_id');
    }
}
