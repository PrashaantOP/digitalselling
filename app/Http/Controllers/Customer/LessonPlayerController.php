<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\CourseLesson;
use App\Models\Enrollment;
use App\Models\LessonNoteFile;
use App\Models\LessonProgress;
use App\Models\QuizAttempt;
use App\Services\CertificateService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class LessonPlayerController extends Controller
{
    use ResolvesCustomer;

    /** GET /me/courses/{enrollmentUuid}/learn/{lessonUuid?} */
    public function show(Request $request, string $enrollmentUuid, ?string $lessonUuid = null)
    {
        $enrollment = Enrollment::with('course.product:id,title,slug')
            ->whereIn('customer_id', $this->customerIds())->where('uuid', $enrollmentUuid)->firstOrFail();

        if ($enrollment->access_expires_at && $enrollment->access_expires_at->isPast()) {
            return Inertia::render('Customer/CourseExpired', [
                'title' => $enrollment->course->product->title,
                'expiredAt' => $enrollment->access_expires_at,
                'buyUrl' => url('/c/' . $enrollment->course->product->slug),
            ]);
        }

        $modules = $enrollment->course->modules()->orderBy('sort_order')
            ->with(['lessons' => fn ($q) => $q->where('is_published', true)->orderBy('sort_order')->select('id', 'uuid', 'module_id', 'title', 'type', 'is_free_preview', 'sort_order')])
            ->get();

        $allLessons = $modules->flatMap->lessons;
        $completed = LessonProgress::where('enrollment_id', $enrollment->id)->where('is_completed', true)->pluck('lesson_id');

        $current = $lessonUuid
            ? $allLessons->firstWhere('uuid', $lessonUuid)
            : ($allLessons->first(fn ($l) => ! $completed->contains($l->id)) ?? $allLessons->first());

        abort_if($lessonUuid && ! $current, 404);

        return Inertia::render('Customer/LessonPlayer', [
            'enrollment' => $enrollment->only(['id', 'uuid', 'progress_percent', 'completed_at', 'certificate_issued_at']) + [
                'course' => $enrollment->course->product->only(['title', 'slug']),
                // poora kar chuka ho par certificate na bana ho (toggle baad me on hua) to yahin ban jaata hai
                'certificate_uuid' => app(CertificateService::class)->ensure($enrollment)?->uuid,
            ],
            'modules' => $modules,
            'completedLessonIds' => $completed,
            'lesson' => $current ? $this->lessonPayload($current->id, $enrollment) : null,
        ]);
    }

    /** POST /me/lessons/{lessonUuid}/complete */
    public function markComplete(Request $request, string $lessonUuid)
    {
        $lesson = CourseLesson::with('module')->where('is_published', true)->where('uuid', $lessonUuid)->firstOrFail();
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
        }

        $enrollment->update($updates);

        return response()->json([
            'progress_percent' => $percent,
            'course_completed' => $percent === 100,
            // naam/course/creator ka snapshot yahin jamta hai (course poora + certificate on ho tabhi)
            'certificate_uuid' => app(CertificateService::class)->ensure($enrollment)?->uuid,
        ]);
    }

    /** GET /me/lesson-files/{fileUuid} — notes/PDF download (sirf jab creator ne allow_download on kiya ho) */
    public function noteFile(string $fileUuid)
    {
        $file = $this->noteFileFor($fileUuid);

        abort_unless($file->note->allow_download, 403, 'Downloads are disabled for these notes.');

        return Storage::disk('local')->download($file->file_path, $file->original_name ?: basename($file->file_path));
    }

    /**
     * GET /me/lesson-files/{fileUuid}/view — notes ko player ke andar padhne ke liye (inline, download nahi).
     * Download band ho tab bhi chalta hai, par sirf un types ke liye jo browser me dikh sakte hain (PDF, txt) —
     * warna ye route band download ka chor darwaza ban jaata.
     */
    public function viewNoteFile(string $fileUuid)
    {
        $file = $this->noteFileFor($fileUuid);
        $kind = $file->viewKind();

        abort_unless($kind, 404);

        return response()->file(Storage::disk('local')->path($file->file_path), [
            'Content-Type' => $kind === 'pdf' ? 'application/pdf' : 'text/plain; charset=UTF-8',
            'Content-Disposition' => 'inline',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /** Enrolled buyer ke published lesson ki file, jo disk pe maujood hai — warna 404. */
    private function noteFileFor(string $fileUuid): LessonNoteFile
    {
        $file = LessonNoteFile::with('note.lesson.module')->where('uuid', $fileUuid)->firstOrFail();

        $this->enrollmentForCourse($file->note->lesson->module->course_id);
        abort_unless($file->note->lesson->is_published, 404);
        abort_unless(Storage::disk('local')->exists($file->file_path), 404);

        return $file;
    }

    private function lessonPayload(int $lessonId, Enrollment $enrollment): array
    {
        $lesson = CourseLesson::with(['video', 'textContent.images', 'audio', 'notes.files', 'assignment', 'quiz.questions.options'])->findOrFail($lessonId);

        $payload = $lesson->only(['id', 'uuid', 'title', 'type', 'is_free_preview']) + ['content' => null, 'extra' => []];

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
                    // har file dikhti hai: padhne ka link (PDF/txt) hamesha, download ka sirf jab creator ne on rakha ho
                    'files' => $note->files->sortBy('sort_order')->values()->map(fn ($f) => [
                        'uuid' => $f->uuid,
                        'name' => $f->original_name ?: 'File',
                        'kind' => $f->viewKind(),
                        'view_url' => $f->viewKind() ? url("/me/lesson-files/{$f->uuid}/view") : null,
                        'download_url' => $note->allow_download ? url("/me/lesson-files/{$f->uuid}") : null,
                    ]),
                ] : null;
                break;
            case 'assignment':
                $payload['content'] = $lesson->assignment?->only(['uuid', 'assignment_prompt', 'allow_file_upload']);
                $payload['extra']['submission'] = $lesson->assignment
                    ? \App\Models\AssignmentSubmission::where('lesson_assignment_id', $lesson->assignment->id)
                        ->where('enrollment_id', $enrollment->id)->first(['id', 'submission_text', 'status', 'grade_feedback', 'submitted_at'])
                    : null;
                break;
            case 'quiz':
                // sahi jawab kabhi frontend ko nahi bhejte (submit ke baad result me aate hain)
                $payload['content'] = $lesson->quiz ? [
                    'id' => $lesson->quiz->id,
                    'uuid' => $lesson->quiz->uuid,
                    'title' => $lesson->quiz->title,
                    'questions' => $lesson->quiz->questions->filter(fn ($q) => $q->options->isNotEmpty())->sortBy('sort_order')->values()->map(fn ($q) => [
                        'id' => $q->id, 'question_text' => $q->question_text, 'question_image_path' => $q->question_image_path, 'type' => $q->type,
                        'options' => $q->options->sortBy('sort_order')->values()->map->only(['id', 'option_text', 'option_image_path']),
                    ]),
                ] : null;
                // jo attempt reset nahi hua uska poora result — refresh ke baad bhi wahi dikhe
                $payload['extra']['last_attempt'] = $lesson->quiz
                    ? QuizAttempt::current($lesson->quiz->id, $enrollment->id)?->result($lesson->quiz)
                    : null;
                break;
        }

        return $payload;
    }
}
