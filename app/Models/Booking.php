<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    use HasFactory;

    protected $table = 'bookings';


    protected $fillable = [
        'booking_service_id',
        'creator_id',
        'customer_id',
        'order_id',
        'scheduled_at',
        'duration_minutes',
        'meeting_link',
        'status',
    ];


    protected $casts = [
        'scheduled_at' => 'datetime',
    ];


    public function service()
    {
        return $this->belongsTo(BookingServiceDetail::class, 'booking_service_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function responses()
    {
        return $this->hasMany(BookingResponse::class, 'booking_id');
    }
}
