<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Models\CourseLesson;
use App\Models\Enrollment;
use App\Models\LessonNoteFile;
use App\Models\LessonProgress;
use App\Models\QuizAttempt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class LessonPlayerController extends Controller
{
    use ResolvesCustomer;

    /** GET /me/courses/{enrollmentId}/learn/{lessonId?} */
    public function show(Request $request, int $enrollmentId, ?int $lessonId = null)
    {
        $enrollment = Enrollment::with('course.product:id,title,slug')
            ->whereIn('customer_id', $this->customerIds())->findOrFail($enrollmentId);

        abort_if($enrollment->access_expires_at && $enrollment->access_expires_at->isPast(), 403, 'Your access to this course has expired.');

        $modules = $enrollment->course->modules()->orderBy('sort_order')
            ->with(['lessons' => fn ($q) => $q->where('is_published', true)->orderBy('sort_order')->select('id', 'module_id', 'title', 'type', 'is_free_preview', 'sort_order')])
            ->get();

        $allLessons = $modules->flatMap->lessons;
        $completed = LessonProgress::where('enrollment_id', $enrollment->id)->where('is_completed', true)->pluck('lesson_id');

        $current = $lessonId
            ? $allLessons->firstWhere('id', $lessonId)
            : ($allLessons->first(fn ($l) => ! $completed->contains($l->id)) ?? $allLessons->first());

        abort_if($lessonId && ! $current, 404);

        return Inertia::render('Customer/LessonPlayer', [
            'enrollment' => $enrollment->only(['id', 'progress_percent', 'completed_at', 'certificate_issued_at']) + [
                'course' => $enrollment->course->product->only(['title', 'slug']),
                'certificate_id' => Certificate::where('enrollment_id', $enrollment->id)->value('id'),
            ],
            'modules' => $modules,
            'completedLessonIds' => $completed,
            'lesson' => $current ? $this->lessonPayload($current->id, $enrollment) : null,
        ]);
    }

    /** POST /me/lessons/{lessonId}/complete */
    public function markComplete(Request $request, int $lessonId)
    {
        $lesson = CourseLesson::with('module')->where('is_published', true)->findOrFail($lessonId);
        $enrollment = $this->enrollmentForCourse($lesson->module->course_id);

        LessonProgress::updateOrCreate(
            ['enrollment_id' => $enrollment->id, 'lesson_id' => $lesson->id],
            ['is_completed' => true, 'completed_at' => now()]
        );

        $total = CourseLesson::where('is_published', true)
            ->whereHas('module', fn ($q) => $q->where('course_id', $enrollment->course_id))->count();

        $done = LessonProgress::where('enrollment_id', $enrollment->id)->where('is_completed', true)
            ->whereHas('lesson', fn ($q) => $q->where('is_published', true))->count();

        $percent = $total ? (int) min(100, floor($done / $total * 100)) : 0;
        $updates = ['progress_percent' => $percent];

        if ($percent === 100 && ! $enrollment->completed_at) {
            $updates['completed_at'] = now();

            if ($enrollment->course->certificate_enabled) {
                Certificate::firstOrCreate(
                    ['enrollment_id' => $enrollment->id],
                    ['certificate_number' => 'CERT-' . strtoupper(Str::random(10)), 'issued_at' => now()]
                );
                $updates['certificate_issued_at'] = now();
            }
        }

        $enrollment->update($updates);

        return response()->json([
            'progress_percent' => $percent,
            'course_completed' => $percent === 100,
            'certificate_id' => Certificate::where('enrollment_id', $enrollment->id)->value('id'),
        ]);
    }

    /** GET /me/lesson-files/{fileId} — notes/PDF download (sirf jab creator ne allow_download on kiya ho) */
    public function noteFile(int $fileId)
    {
        $file = LessonNoteFile::with('note.lesson.module')->findOrFail($fileId);

        $this->enrollmentForCourse($file->note->lesson->module->course_id);
        abort_unless($file->note->allow_download, 403, 'Downloads are disabled for these notes.');
        abort_unless(Storage::disk('local')->exists($file->file_path), 404);

        return Storage::disk('local')->download($file->file_path, $file->original_name ?: basename($file->file_path));
    }

    private function lessonPayload(int $lessonId, Enrollment $enrollment): array
    {
        $lesson = CourseLesson::with(['video', 'textContent.images', 'audio', 'notes.files', 'assignment', 'quiz.questions.options'])->findOrFail($lessonId);

        $payload = $lesson->only(['id', 'title', 'type', 'is_free_preview']) + ['content' => null, 'extra' => []];

        switch ($lesson->type) {
            case 'video':
                $payload['content'] = $lesson->video?->only(['video_url', 'video_source', 'notes', 'duration_seconds']);
                break;
            case 'text_image':
                $payload['content'] = $lesson->textContent ? ['content' => $lesson->textContent->content, 'images' => $lesson->textContent->images->pluck('image_path')] : null;
                break;
            case 'audio':
                $payload['content'] = $lesson->audio?->only(['audio_url', 'audio_path', 'notes', 'duration_seconds']);
                break;
            case 'notes_pdf':
                $note = $lesson->notes;
                $payload['content'] = $note ? [
                    'description' => $note->description,
                    'allow_download' => $note->allow_download,
                    'files' => $note->allow_download ? $note->files->map(fn ($f) => [
                        'name' => $f->original_name, 'url' => url("/me/lesson-files/{$f->id}"),
                    ]) : [],
                ] : null;
                break;
            case 'assignment':
                $payload['content'] = $lesson->assignment?->only(['assignment_prompt', 'allow_file_upload']);
                $payload['extra']['submission'] = $lesson->assignment
                    ? \App\Models\AssignmentSubmission::where('lesson_assignment_id', $lesson->assignment->id)
                        ->where('enrollment_id', $enrollment->id)->first(['id', 'submission_text', 'status', 'grade_feedback', 'submitted_at'])
                    : null;
                break;
            case 'quiz':
                // sahi jawab kabhi frontend ko nahi bhejte (submit ke baad result me aate hain)
                $payload['content'] = $lesson->quiz ? [
                    'id' => $lesson->quiz->id,
                    'title' => $lesson->quiz->title,
                    'questions' => $lesson->quiz->questions->sortBy('sort_order')->values()->map(fn ($q) => [
                        'id' => $q->id, 'question_text' => $q->question_text, 'question_image_path' => $q->question_image_path, 'type' => $q->type,
                        'options' => $q->options->sortBy('sort_order')->values()->map->only(['id', 'option_text', 'option_image_path']),
                    ]),
                ] : null;
                $payload['extra']['last_attempt'] = $lesson->quiz
                    ? QuizAttempt::where('quiz_id', $lesson->quiz->id)->where('enrollment_id', $enrollment->id)->latest('attempted_at')->first(['id', 'score', 'total_questions', 'correct_answers', 'attempted_at'])
                    : null;
                break;
        }

        return $payload;
    }
}
