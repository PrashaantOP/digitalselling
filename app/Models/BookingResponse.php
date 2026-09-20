<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BookingResponse extends Model
{
    use HasFactory;

    protected $table = 'booking_responses';


    protected $fillable = [
        'booking_id',
        'question_label',
        'answer',
    ];


    public function booking()
    {
        return $this->belongsTo(Booking::class, 'booking_id');
    }
}
