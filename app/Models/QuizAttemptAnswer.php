<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuizAttemptAnswer extends Model
{
    use HasFactory;

    protected $table = 'quiz_attempt_answers';


    public $timestamps = false;


    protected $fillable = [
        'attempt_id',
        'question_id',
        'selected_option_ids',
        'is_correct',
    ];


    protected $casts = [
        'selected_option_ids' => 'array',
        'is_correct' => 'boolean',
    ];


    public function attempt()
    {
        return $this->belongsTo(QuizAttempt::class, 'attempt_id');
    }

    public function question()
    {
        return $this->belongsTo(QuizQuestion::class, 'question_id');
    }
}
