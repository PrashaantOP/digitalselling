<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EventRegistration extends Model
{
    use HasFactory;

    protected $table = 'event_registrations';


    public $timestamps = false;


    protected $fillable = [
        'event_id',
        'customer_id',
        'order_id',
        'attended',
        'registered_at',
    ];


    protected $casts = [
        'attended' => 'boolean',
        'registered_at' => 'datetime',
    ];


    public function event()
    {
        return $this->belongsTo(EventDetail::class, 'event_id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}
