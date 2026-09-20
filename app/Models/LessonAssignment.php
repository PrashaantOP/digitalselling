<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LessonAssignment extends Model
{
    use HasFactory;

    protected $table = 'lesson_assignments';


    protected $fillable = [
        'lesson_id',
        'assignment_prompt',
        'allow_file_upload',
    ];


    protected $casts = [
        'allow_file_upload' => 'boolean',
    ];


    public function lesson()
    {
        return $this->belongsTo(CourseLesson::class, 'lesson_id');
    }

    public function submissions()
    {
        return $this->hasMany(AssignmentSubmission::class, 'lesson_assignment_id');
    }
}
