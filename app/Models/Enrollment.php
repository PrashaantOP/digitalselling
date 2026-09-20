<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Enrollment extends Model
{
    use HasFactory;

    protected $table = 'enrollments';


    public $timestamps = false;


    protected $fillable = [
        'course_id',
        'customer_id',
        'order_id',
        'progress_percent',
        'access_expires_at',
        'completed_at',
        'certificate_issued_at',
        'created_at',
    ];


    protected $casts = [
        'access_expires_at' => 'datetime',
        'completed_at' => 'datetime',
        'certificate_issued_at' => 'datetime',
        'created_at' => 'datetime',
    ];


    public function course()
    {
        return $this->belongsTo(CourseDetail::class, 'course_id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function lessonProgress()
    {
        return $this->hasMany(LessonProgress::class, 'enrollment_id');
    }

    public function quizAttempts()
    {
        return $this->hasMany(QuizAttempt::class, 'enrollment_id');
    }

    public function assignmentSubmissions()
    {
        return $this->hasMany(AssignmentSubmission::class, 'enrollment_id');
    }

    public function certificate()
    {
        return $this->hasOne(Certificate::class, 'enrollment_id');
    }
}
