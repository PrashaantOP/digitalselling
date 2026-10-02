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
        'cleared_at',
    ];

    protected $casts = [
        'score' => 'decimal:2',
        'attempted_at' => 'datetime',
        'cleared_at' => 'datetime',
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

    /** Is student ka wo attempt jo player me dikhna chahiye — sabse naya, jo reset nahi hua. */
    public static function current(int $quizId, int $enrollmentId): ?self
    {
        return self::with('answers')->where('quiz_id', $quizId)->where('enrollment_id', $enrollmentId)
            ->whereNull('cleared_at')->latest('attempted_at')->latest('id')->first();
    }

    /**
     * Player ke liye result: score + har sawaal pe kya chuna tha aur sahi kya hai.
     * Sahi jawab sirf yahin se bahar jaate hain — yaani submit ke baad hi.
     */
    public function result(Quiz $quiz): array
    {
        $answers = $this->answers->keyBy('question_id');

        return [
            'score' => (float) $this->score,
            'total_questions' => $this->total_questions,
            'correct_answers' => $this->correct_answers,
            'attempted_at' => $this->attempted_at,
            'review' => $quiz->questions->map(fn (QuizQuestion $question) => [
                'question_id' => $question->id,
                'selected' => array_values($answers->get($question->id)?->selected_option_ids ?? []),
                'correct' => $question->options->where('is_correct', true)->pluck('id')->sort()->values()->all(),
                'is_correct' => (bool) $answers->get($question->id)?->is_correct,
            ])->values()->all(),
        ];
    }
}
