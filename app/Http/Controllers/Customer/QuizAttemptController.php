<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QuizAttemptController extends Controller
{
    use ResolvesCustomer;

    /** POST /me/quiz/{quizUuid}/attempt   body: answers: { "<questionId>": [optionId, ...], ... } */
    public function store(Request $request, string $quizUuid)
    {
        [$quiz, $enrollment] = $this->quizFor($quizUuid);

        $data = $request->validate([
            'answers' => ['required', 'array'],
            'answers.*' => ['array'],
            'answers.*.*' => ['integer'],
        ]);

        $rows = [];

        foreach ($quiz->questions as $question) {
            // bina option ka sawaal player me dikhta hi nahi — use gino mat
            if ($question->options->isEmpty()) {
                continue;
            }

            $validIds = $question->options->pluck('id');
            $selected = collect($data['answers'][$question->id] ?? [])->map(fn ($v) => (int) $v)
                ->filter(fn ($id) => $validIds->contains($id))->unique()->sort()->values();

            // single choice me ek hi jawab — do bhej kar "dono me se koi to sahi hoga" nahi chalta
            if ($question->type !== 'multiple_choice') {
                $selected = $selected->take(1);
            }

            $correct = $question->options->where('is_correct', true)->pluck('id')->sort()->values();

            $rows[] = ['question_id' => $question->id, 'selected' => $selected->all(), 'is_correct' => $selected->isNotEmpty() && $selected->all() === $correct->all()];
        }

        $unanswered = collect($rows)->filter(fn ($r) => $r['selected'] === [])->count();
        if ($unanswered > 0) {
            throw ValidationException::withMessages(['answers' => $unanswered === 1 ? 'Answer the remaining question before you submit.' : "Answer the remaining {$unanswered} questions before you submit."]);
        }

        $attempt = DB::transaction(function () use ($quiz, $enrollment, $rows) {
            // result aa chuka ho to pehle Reset — warna do tab se do "current" attempt ban jaate
            $this->clear($quiz, $enrollment);

            $total = count($rows);
            $correctCount = collect($rows)->where('is_correct', true)->count();

            $attempt = QuizAttempt::create([
                'quiz_id' => $quiz->id,
                'enrollment_id' => $enrollment->id,
                'total_questions' => $total,
                'correct_answers' => $correctCount,
                'score' => $total ? round($correctCount / $total * 100, 2) : 0,
                'attempted_at' => now(),
            ]);

            foreach ($rows as $r) {
                $attempt->answers()->create(['question_id' => $r['question_id'], 'selected_option_ids' => $r['selected'], 'is_correct' => $r['is_correct']]);
            }

            return $attempt->load('answers');
        });

        return response()->json(['result' => $attempt->result($quiz)], 201);
    }

    /**
     * POST /me/quiz/{quizUuid}/reset — student quiz dobara shuru kare. Result sirf isi se hat-ta hai
     * (page refresh se nahi). Attempt delete nahi hota: creator ki history aur lesson ka progress wahi rehta hai.
     */
    public function reset(string $quizUuid)
    {
        [$quiz, $enrollment] = $this->quizFor($quizUuid);

        $this->clear($quiz, $enrollment);

        return response()->json(['reset' => true]);
    }

    /** @return array{0: Quiz, 1: Enrollment} */
    private function quizFor(string $quizUuid): array
    {
        $quiz = Quiz::with(['questions' => fn ($q) => $q->orderBy('sort_order'), 'questions.options', 'lesson.module'])->where('uuid', $quizUuid)->firstOrFail();
        $enrollment = $this->enrollmentForCourse($quiz->lesson->module->course_id);

        abort_unless($quiz->lesson->is_published, 404);

        return [$quiz, $enrollment];
    }

    private function clear(Quiz $quiz, Enrollment $enrollment): void
    {
        QuizAttempt::where('quiz_id', $quiz->id)->where('enrollment_id', $enrollment->id)->whereNull('cleared_at')->update(['cleared_at' => now()]);
    }
}
