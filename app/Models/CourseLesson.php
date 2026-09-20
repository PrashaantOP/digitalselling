<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourseLesson extends Model
{
    use HasFactory;

    protected $table = 'course_lessons';


    protected $fillable = [
        'module_id',
        'title',
        'type',
        'is_published',
        'is_free_preview',
        'sort_order',
    ];


    protected $casts = [
        'is_published' => 'boolean',
        'is_free_preview' => 'boolean',
    ];


    public function module()
    {
        return $this->belongsTo(CourseModule::class, 'module_id');
    }

    public function video()
    {
        return $this->hasOne(LessonVideo::class, 'lesson_id');
    }

    public function textContent()
    {
        return $this->hasOne(LessonTextContent::class, 'lesson_id');
    }

    public function audio()
    {
        return $this->hasOne(LessonAudio::class, 'lesson_id');
    }

    public function notes()
    {
        return $this->hasOne(LessonNote::class, 'lesson_id');
    }

    public function assignment()
    {
        return $this->hasOne(LessonAssignment::class, 'lesson_id');
    }

    public function quiz()
    {
        return $this->hasOne(Quiz::class, 'lesson_id');
    }

    public function progress()
    {
        return $this->hasMany(LessonProgress::class, 'lesson_id');
    }
}
