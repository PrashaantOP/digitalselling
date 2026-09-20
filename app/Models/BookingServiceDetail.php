<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BookingServiceDetail extends Model
{
    use HasFactory;

    protected $table = 'booking_service_details';


    protected $fillable = [
        'product_id',
        'duration_minutes',
        'is_active',
    ];


    protected $casts = [
        'is_active' => 'boolean',
    ];


    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class, 'booking_service_id');
    }
}
