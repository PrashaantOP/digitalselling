<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\CourseLesson;
use App\Models\CourseModule;
use App\Models\LessonAssignment;
use App\Models\LessonAudio;
use App\Models\LessonNote;
use App\Models\LessonTextContent;
use App\Models\LessonVideo;
use App\Models\Quiz;
use App\Services\CourseContentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CourseLessonController extends Controller
{
    use RespondsFlexibly;

    private const TYPES = ['video', 'text_image', 'audio', 'quiz', 'assignment', 'notes_pdf'];

    /** Lesson + uske type ka detail row — ek transaction me. */
    public function store(Request $request, CourseModule $module)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'type' => ['required', Rule::in(self::TYPES)],
            'is_free_preview' => ['sometimes', 'boolean'],
            'is_published' => ['sometimes', 'boolean'],
        ]);

        $lesson = DB::transaction(function () use ($module, $data) {
            $lesson = $module->lessons()->create([
                'title' => $data['title'],
                'type' => $data['type'],
                'is_free_preview' => $data['is_free_preview'] ?? false,
                'is_published' => $data['is_published'] ?? false,
                'sort_order' => (int) $module->lessons()->max('sort_order') + 1,
            ]);

            // NOT NULL columns ke liye empty defaults
            match ($data['type']) {
                'video' => LessonVideo::create(['lesson_id' => $lesson->id, 'video_url' => '']),
                'text_image' => LessonTextContent::create(['lesson_id' => $lesson->id, 'content' => '']),
                'audio' => LessonAudio::create(['lesson_id' => $lesson->id]),
                'quiz' => Quiz::create(['lesson_id' => $lesson->id, 'title' => $data['title']]),
                'assignment' => LessonAssignment::create(['lesson_id' => $lesson->id, 'assignment_prompt' => '', 'allow_file_upload' => true]),
                'notes_pdf' => LessonNote::create(['lesson_id' => $lesson->id]),
            };

            return $lesson;
        });

        CourseContentService::recount($module->course_id);

        return $this->done($request, 'Lesson added.', ['lesson' => $this->withContent($lesson)], null, 201);
    }

    /** Sirf lesson ka meta (title/publish/free-preview). Type change allowed nahi. */
    public function update(Request $request, CourseLesson $lesson)
    {
        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:150'],
            'is_published' => ['sometimes', 'boolean'],
            'is_free_preview' => ['sometimes', 'boolean'],
        ]);

        $lesson->update($data);

        if ($lesson->type === 'quiz' && isset($data['title'])) {
            $lesson->quiz?->update(['title' => $data['title']]);
        }

        return $this->done($request, 'Lesson updated.', ['lesson' => $lesson]);
    }

    public function destroy(Request $request, CourseLesson $lesson)
    {
        $courseId = $lesson->module->course_id;
        $lesson->delete();
        CourseContentService::recount($courseId);

        return $this->done($request, 'Lesson deleted.');
    }

    /**
     * body => items: [{id, module_id}, ...]  — poori list top→bottom (modules ke beech move bhi ho sakta hai).
     */
    public function reorder(Request $request)
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'integer', 'distinct'],
            'items.*.module_id' => ['required', 'integer'],
        ]);

        $tid = $this->tid();
        $lessonIds = collect($data['items'])->pluck('id');
        $moduleIds = collect($data['items'])->pluck('module_id')->unique();

        $okLessons = CourseLesson::whereIn('id', $lessonIds)->whereHas('module.course.product', fn ($q) => $q->where('creator_id', $tid))->count();
        $okModules = CourseModule::whereIn('id', $moduleIds)->whereHas('course.product', fn ($q) => $q->where('creator_id', $tid))->count();

        abort_unless($okLessons === $lessonIds->count() && $okModules === $moduleIds->count(), 404);

        $touchedCourses = CourseModule::whereIn('id', $moduleIds)->pluck('course_id')->unique();
        abort_unless($touchedCourses->count() === 1, 422, 'Lessons can only move within the same course.');

        DB::transaction(function () use ($data) {
            $positions = [];
            foreach ($data['items'] as $item) {
                $positions[$item['module_id']] = ($positions[$item['module_id']] ?? -1) + 1;
                CourseLesson::whereKey($item['id'])->update([
                    'module_id' => $item['module_id'],
                    'sort_order' => $positions[$item['module_id']],
                ]);
            }
        });

        return $this->done($request, 'Order saved.');
    }

    private function withContent(CourseLesson $lesson): CourseLesson
    {
        return $lesson->load(['video', 'textContent.images', 'audio', 'notes.files', 'assignment', 'quiz.questions.options']);
    }
}
