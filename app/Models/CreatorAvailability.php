<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CreatorAvailability extends Model
{
    use HasFactory;

    protected $table = 'creator_availability';


    protected $fillable = [
        'user_id',
        'timezone',
        'weekday',
        'is_enabled',
        'start_time',
        'end_time',
    ];


    protected $casts = [
        'is_enabled' => 'boolean',
    ];


    public function creator()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
