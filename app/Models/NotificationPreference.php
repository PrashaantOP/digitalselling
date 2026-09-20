<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationPreference extends Model
{
    use HasFactory;

    protected $table = 'notification_preferences';


    protected $fillable = [
        'user_id',
        'course_enrollment',
        'course_completion',
        'new_messages',
        'payment_received',
        'weekly_digest',
    ];


    protected $casts = [
        'course_enrollment' => 'boolean',
        'course_completion' => 'boolean',
        'new_messages' => 'boolean',
        'payment_received' => 'boolean',
        'weekly_digest' => 'boolean',
    ];


    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
