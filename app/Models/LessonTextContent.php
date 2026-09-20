<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LessonTextContent extends Model
{
    use HasFactory;

    protected $table = 'lesson_text_contents';


    protected $fillable = [
        'lesson_id',
        'content',
    ];


    public function lesson()
    {
        return $this->belongsTo(CourseLesson::class, 'lesson_id');
    }

    public function images()
    {
        return $this->hasMany(LessonTextImage::class, 'lesson_text_content_id');
    }
}
