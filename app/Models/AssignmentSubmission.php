<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssignmentSubmission extends Model
{
    use HasFactory;

    protected $table = 'assignment_submissions';


    protected $fillable = [
        'lesson_assignment_id',
        'enrollment_id',
        'submission_file_path',
        'submission_text',
        'status',
        'grade_feedback',
        'submitted_at',
    ];


    protected $casts = [
        'submitted_at' => 'datetime',
    ];


    public function assignment()
    {
        return $this->belongsTo(LessonAssignment::class, 'lesson_assignment_id');
    }

    public function enrollment()
    {
        return $this->belongsTo(Enrollment::class, 'enrollment_id');
    }
}
