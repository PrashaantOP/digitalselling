<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AvailabilityException extends Model
{
    use HasFactory;

    protected $table = 'availability_exceptions';


    protected $fillable = [
        'user_id',
        'date',
        'is_blocked',
        'reason',
    ];


    protected $casts = [
        'date' => 'date',
        'is_blocked' => 'boolean',
    ];


    public function creator()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
