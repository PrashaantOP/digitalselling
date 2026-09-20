<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\CourseLesson;
use App\Services\QuizParser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * AI se quiz questions. Default me sirf PREVIEW return karta hai (creator review kare);
 * `save=1` bhejo to seedha quiz me add bhi kar deta hai.
 * Config: services.anthropic.key / services.anthropic.model
 */
class QuizAiGenerateController extends Controller
{
    use RespondsFlexibly;

    public function generate(Request $request, CourseLesson $lesson, QuizParser $parser)
    {
        abort_unless($lesson->type === 'quiz' && $lesson->quiz, 422, 'This lesson is not a quiz.');

        $data = $request->validate([
            'topic' => ['required', 'string', 'max:2000'],
            'count' => ['required', 'integer', 'min:1', 'max:20'],
            'difficulty' => ['nullable', Rule::in(['easy', 'medium', 'hard'])],
            'type' => ['nullable', Rule::in(['single_choice', 'multiple_choice', 'mixed'])],
            'save' => ['sometimes', 'boolean'],
        ]);

        $key = config('services.anthropic.key');
        abort_unless($key, 503, 'AI quiz generation is not configured.');

        $prompt = sprintf(
            "Create %d %s multiple-choice quiz questions about: %s\n" .
            "Question style: %s.\n" .
            "Return ONLY a JSON array (no markdown, no commentary). Each item: " .
            '{"question": string, "options": [string, string, string, string], "correct": [zero-based indexes of the correct options]}. ' .
            'Use exactly one correct index for single_choice questions.',
            $data['count'],
            $data['difficulty'] ?? 'medium',
            $data['topic'],
            $data['type'] ?? 'single_choice'
        );

        $response = Http::withHeaders(['x-api-key' => $key, 'anthropic-version' => '2023-06-01'])
            ->timeout(60)
            ->post('https://api.anthropic.com/v1/messages', [
                'model' => config('services.anthropic.model', 'claude-sonnet-5'),
                'max_tokens' => 4000,
                'messages' => [['role' => 'user', 'content' => $prompt]],
            ]);

        if ($response->failed()) {
            report(new \RuntimeException('AI quiz generation failed: ' . $response->body()));
            throw ValidationException::withMessages(['topic' => 'AI service is unavailable right now. Please try again.']);
        }

        $text = collect($response->json('content', []))->where('type', 'text')->pluck('text')->implode('');
        $text = trim(preg_replace('/^```(?:json)?|```$/m', '', $text));

        $questions = $parser->parse('json', $text);

        if (! $questions) {
            throw ValidationException::withMessages(['topic' => 'Could not generate valid questions. Try a more specific topic.']);
        }

        if ($request->boolean('save')) {
            $quiz = $lesson->quiz;
            DB::transaction(function () use ($questions, $quiz) {
                $order = (int) $quiz->questions()->max('sort_order');
                foreach ($questions as $q) {
                    $question = $quiz->questions()->create([
                        'question_text' => $q['question_text'], 'type' => $q['type'], 'sort_order' => ++$order,
                    ]);
                    foreach ($q['options'] as $i => $o) {
                        $question->options()->create(['option_text' => $o['text'], 'is_correct' => $o['is_correct'], 'sort_order' => $i]);
                    }
                }
            });
        }

        return $this->done($request, 'Questions generated.', ['questions' => $questions, 'saved' => $request->boolean('save')]);
    }
}
