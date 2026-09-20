<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LiveClass extends Model
{
    use HasFactory;

    protected $table = 'live_classes';


    protected $fillable = [
        'course_id',
        'title',
        'description',
        'scheduled_at',
        'duration_minutes',
        'join_link',
    ];


    protected $casts = [
        'scheduled_at' => 'datetime',
    ];


    public function course()
    {
        return $this->belongsTo(CourseDetail::class, 'course_id');
    }
}
