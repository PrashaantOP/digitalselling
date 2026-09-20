<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EventDetail extends Model
{
    use HasFactory;

    protected $table = 'event_details';


    protected $fillable = [
        'product_id',
        'mode',
        'starts_at',
        'ends_at',
        'join_link',
        'venue_address',
    ];


    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];


    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function registrations()
    {
        return $this->hasMany(EventRegistration::class, 'event_id');
    }
}
