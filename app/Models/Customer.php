<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    protected $table = 'customers';


    protected $fillable = [
        'creator_id',
        'name',
        'email',
        'phone',
        'total_orders',
        'total_spent',
        'first_purchase_at',
        'joined_at',
    ];


    protected $casts = [
        'total_spent' => 'decimal:2',
        'first_purchase_at' => 'datetime',
        'joined_at' => 'datetime',
    ];


    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'customer_id');
    }

    public function enrollments()
    {
        return $this->hasMany(Enrollment::class, 'customer_id');
    }

    public function eventRegistrations()
    {
        return $this->hasMany(EventRegistration::class, 'customer_id');
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class, 'customer_id');
    }
}
