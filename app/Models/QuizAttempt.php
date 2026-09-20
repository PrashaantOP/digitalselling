<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuizAttempt extends Model
{
    use HasFactory;

    protected $table = 'quiz_attempts';


    public $timestamps = false;


    protected $fillable = [
        'quiz_id',
        'enrollment_id',
        'score',
        'total_questions',
        'correct_answers',
        'attempted_at',
    ];


    protected $casts = [
        'score' => 'decimal:2',
        'attempted_at' => 'datetime',
    ];


    public function quiz()
    {
        return $this->belongsTo(Quiz::class, 'quiz_id');
    }

    public function enrollment()
    {
        return $this->belongsTo(Enrollment::class, 'enrollment_id');
    }

    public function answers()
    {
        return $this->hasMany(QuizAttemptAnswer::class, 'attempt_id');
    }
}
