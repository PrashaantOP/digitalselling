<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\CourseLesson;
use App\Services\QuizParser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** CSV / JSON / Aiken / GIFT se questions import. File upload ya `content` text dono chalte hain. */
class QuizImportController extends Controller
{
    use RespondsFlexibly;

    public function import(Request $request, CourseLesson $lesson, QuizParser $parser)
    {
        abort_unless($lesson->type === 'quiz' && $lesson->quiz, 422, 'This lesson is not a quiz.');

        $data = $request->validate([
            'format' => ['required', Rule::in(['csv', 'json', 'aiken', 'gift'])],
            'file' => ['required_without:content', 'nullable', 'file', 'max:2048', 'mimes:csv,txt,json,gift'],
            'content' => ['required_without:file', 'nullable', 'string', 'max:500000'],
        ]);

        $raw = $request->hasFile('file') ? file_get_contents($request->file('file')->getRealPath()) : $data['content'];

        $questions = $parser->parse($data['format'], $raw);

        if (! $questions) {
            throw ValidationException::withMessages([
                'file' => $parser->errors ?: ['No valid questions found in the file.'],
            ]);
        }

        $quiz = $lesson->quiz;

        DB::transaction(function () use ($questions, $quiz) {
            $order = (int) $quiz->questions()->max('sort_order');

            foreach ($questions as $q) {
                $question = $quiz->questions()->create([
                    'question_text' => $q['question_text'],
                    'type' => $q['type'],
                    'sort_order' => ++$order,
                ]);

                foreach ($q['options'] as $i => $o) {
                    $question->options()->create([
                        'option_text' => $o['text'],
                        'is_correct' => $o['is_correct'],
                        'sort_order' => $i,
                    ]);
                }
            }
        });

        return $this->done($request, count($questions) . ' question(s) imported.', [
            'imported' => count($questions),
            'skipped' => $parser->errors,
            'questions' => $quiz->questions()->with('options')->orderBy('sort_order')->get(),
        ]);
    }
}
