<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuizAttemptController extends Controller
{
    use ResolvesCustomer;

    /** POST /me/quiz/{quizId}/attempt   body: answers: { "<questionId>": [optionId, ...], ... } */
    public function store(Request $request, int $quizId)
    {
        $quiz = Quiz::with(['questions.options', 'lesson.module'])->findOrFail($quizId);
        $enrollment = $this->enrollmentForCourse($quiz->lesson->module->course_id);

        abort_unless($quiz->lesson->is_published, 404);

        $data = $request->validate([
            'answers' => ['required', 'array'],
            'answers.*' => ['array'],
            'answers.*.*' => ['integer'],
        ]);

        $result = DB::transaction(function () use ($quiz, $enrollment, $data) {
            $rows = [];
            $correctCount = 0;

            foreach ($quiz->questions as $question) {
                $validIds = $question->options->pluck('id');
                $selected = collect($data['answers'][$question->id] ?? [])->map(fn ($v) => (int) $v)
                    ->filter(fn ($id) => $validIds->contains($id))->unique()->sort()->values();
                $correct = $question->options->where('is_correct', true)->pluck('id')->sort()->values();

                $isCorrect = $selected->isNotEmpty() && $selected->all() === $correct->all();
                $correctCount += $isCorrect ? 1 : 0;

                $rows[] = ['question_id' => $question->id, 'selected' => $selected->all(), 'correct' => $correct->all(), 'is_correct' => $isCorrect];
            }

            $total = $quiz->questions->count();

            $attempt = QuizAttempt::create([
                'quiz_id' => $quiz->id,
                'enrollment_id' => $enrollment->id,
                'total_questions' => $total,
                'correct_answers' => $correctCount,
                'score' => $total ? round($correctCount / $total * 100, 2) : 0,
                'attempted_at' => now(),
            ]);

            foreach ($rows as $r) {
                $attempt->answers()->create([
                    'question_id' => $r['question_id'],
                    'selected_option_ids' => $r['selected'],
                    'is_correct' => $r['is_correct'],
                ]);
            }

            return ['attempt' => $attempt, 'review' => $rows];
        });

        return response()->json([
            'attempt' => $result['attempt']->only(['id', 'score', 'total_questions', 'correct_answers']),
            'review' => $result['review'], // ab correct option ids dikha sakte hain
        ], 201);
    }
}
