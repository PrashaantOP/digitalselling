<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LessonAudio extends Model
{
    use HasFactory;

    protected $table = 'lesson_audios';


    protected $fillable = [
        'lesson_id',
        'audio_url',
        'audio_path',
        'notes',
        'duration_seconds',
    ];


    public function lesson()
    {
        return $this->belongsTo(CourseLesson::class, 'lesson_id');
    }
}
