<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LessonNote extends Model
{
    use HasFactory;

    protected $table = 'lesson_notes';


    protected $fillable = [
        'lesson_id',
        'allow_download',
        'description',
    ];


    protected $casts = [
        'allow_download' => 'boolean',
    ];


    public function lesson()
    {
        return $this->belongsTo(CourseLesson::class, 'lesson_id');
    }

    public function files()
    {
        return $this->hasMany(LessonNoteFile::class, 'lesson_note_id');
    }
}
