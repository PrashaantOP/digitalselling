<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuizQuestion extends Model
{
    use HasFactory;

    protected $table = 'quiz_questions';


    protected $fillable = [
        'quiz_id',
        'question_text',
        'question_image_path',
        'type',
        'sort_order',
    ];


    public function quiz()
    {
        return $this->belongsTo(Quiz::class, 'quiz_id');
    }

    public function options()
    {
        return $this->hasMany(QuizOption::class, 'question_id');
    }

    public function attemptAnswers()
    {
        return $this->hasMany(QuizAttemptAnswer::class, 'question_id');
    }
}
