<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LessonVideo extends Model
{
    use HasFactory;

    protected $table = 'lesson_videos';


    protected $fillable = [
        'lesson_id',
        'video_url',
        'video_source',
        'notes',
        'duration_seconds',
    ];


    public function lesson()
    {
        return $this->belongsTo(CourseLesson::class, 'lesson_id');
    }
}
