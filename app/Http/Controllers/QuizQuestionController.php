<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesUploads;
use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\CourseLesson;
use App\Models\QuizOption;
use App\Models\QuizQuestion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class QuizQuestionController extends Controller
{
    use RespondsFlexibly, HandlesUploads;

    public function store(Request $request, CourseLesson $lesson)
    {
        abort_unless($lesson->type === 'quiz' && $lesson->quiz, 422, 'This lesson is not a quiz.');

        $data = $this->validated($request);
        $quiz = $lesson->quiz;

        $question = DB::transaction(function () use ($request, $data, $quiz) {
            $question = $quiz->questions()->create([
                'question_text' => $data['question_text'],
                'type' => $data['type'],
                'question_image_path' => $request->hasFile('question_image') ? $this->putPublic($request->file('question_image'), 'quiz') : null,
                'sort_order' => (int) $quiz->questions()->max('sort_order') + 1,
            ]);

            $this->syncOptions($request, $question, $data['options']);

            return $question;
        });

        return $this->done($request, 'Question added.', ['question' => $question->load('options')], null, 201);
    }

    public function update(Request $request, QuizQuestion $quizQuestion)
    {
        $data = $this->validated($request);

        DB::transaction(function () use ($request, $data, $quizQuestion) {
            $attrs = ['question_text' => $data['question_text'], 'type' => $data['type']];

            if ($request->hasFile('question_image')) {
                $this->deletePublic($quizQuestion->question_image_path);
                $attrs['question_image_path'] = $this->putPublic($request->file('question_image'), 'quiz');
            } elseif ($request->boolean('remove_question_image')) {
                $this->deletePublic($quizQuestion->question_image_path);
                $attrs['question_image_path'] = null;
            }

            $quizQuestion->update($attrs);
            $this->syncOptions($request, $quizQuestion, $data['options']);
        });

        return $this->done($request, 'Question updated.', ['question' => $quizQuestion->fresh('options')]);
    }

    public function destroy(Request $request, QuizQuestion $quizQuestion)
    {
        $this->deletePublic($quizQuestion->question_image_path);
        foreach ($quizQuestion->options as $o) {
            $this->deletePublic($o->option_image_path);
        }
        $quizQuestion->delete();

        return $this->done($request, 'Question deleted.');
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'question_text' => ['required', 'string', 'max:2000'],
            'type' => ['required', Rule::in(['single_choice', 'multiple_choice'])],
            'question_image' => ['nullable', 'image', 'max:5120'],
            'options' => ['required', 'array', 'min:2', 'max:8'],
            'options.*.id' => ['nullable', 'integer'],
            'options.*.text' => ['nullable', 'string', 'max:500'],
            'options.*.is_correct' => ['sometimes', 'boolean'],
            'options.*.image' => ['nullable', 'image', 'max:5120'],
        ]);

        $correct = collect($data['options'])->filter(fn ($o) => ! empty($o['is_correct']))->count();

        if ($correct < 1 || ($data['type'] === 'single_choice' && $correct !== 1)) {
            throw ValidationException::withMessages([
                'options' => $data['type'] === 'single_choice' ? 'Mark exactly one correct option.' : 'Mark at least one correct option.',
            ]);
        }

        return $data;
    }

    /** id wale options update, bina id wale naye, request me na aane wale delete (attempt history ke liye ids stable rehte hain). */
    private function syncOptions(Request $request, QuizQuestion $question, array $options): void
    {
        $existing = $question->options()->get()->keyBy('id');
        $keep = [];

        foreach (array_values($options) as $i => $opt) {
            $model = ! empty($opt['id']) && $existing->has($opt['id']) ? $existing[$opt['id']] : new QuizOption(['question_id' => $question->id]);

            $model->option_text = $opt['text'] ?? '';
            $model->is_correct = ! empty($opt['is_correct']);
            $model->sort_order = $i;

            if ($request->hasFile("options.$i.image")) {
                $this->deletePublic($model->option_image_path);
                $model->option_image_path = $this->putPublic($request->file("options.$i.image"), 'quiz');
            }

            $model->save();
            $keep[] = $model->id;
        }

        foreach ($existing->except($keep) as $gone) {
            $this->deletePublic($gone->option_image_path);
            $gone->delete();
        }
    }
}
