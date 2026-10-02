<?php

namespace App\Http\Controllers\Public;

use App\Models\CourseLesson;
use App\Models\Product;
use Illuminate\Support\Facades\Storage;

class CourseCheckoutController extends BaseProductCheckoutController
{
    protected function type(): string { return 'course'; }
    protected function view(): string { return 'Course'; }

    protected function relations(): array
    {
        return [
            'courseDetail.modules' => fn ($q) => $q->orderBy('sort_order'),
            'courseDetail.modules.lessons' => fn ($q) => $q->where('is_published', true)->orderBy('sort_order'),
            'courseDetail.instructions' => fn ($q) => $q->where('is_enabled', true)->orderBy('sort_order'),
            'courseDetail.benefits' => fn ($q) => $q->where('is_enabled', true)->orderBy('sort_order'),
            'courseDetail.highlights' => fn ($q) => $q->where('is_enabled', true)->orderBy('sort_order'),
            'courseDetail.faqs' => fn ($q) => $q->where('is_enabled', true)->orderBy('sort_order'),
            'courseDetail.testimonials' => fn ($q) => $q->where('is_enabled', true)->orderBy('sort_order'),
            'courseDetail.galleryItems' => fn ($q) => $q->where('is_enabled', true)->orderBy('sort_order'),
            'courseDetail.liveClasses' => fn ($q) => $q->where('scheduled_at', '>=', now())->orderBy('scheduled_at'),
        ];
    }

    protected function extra(Product $product): array
    {
        $d = $product->courseDetail;

        return [
            'course' => [
                'access_type' => $d->access_type,
                'access_days' => $d->access_days,
                'certificate_enabled' => $d->certificate_enabled,
                'total_lessons' => $d->total_lessons,
                // curriculum: sirf title/type/free-preview — asli content nahi
                'modules' => $d->modules->map(fn ($m) => [
                    'id' => $m->id,
                    'title' => $m->title,
                    // uuid sirf free-preview lessons ka — wahi bina kharide khul sakte hain
                    'lessons' => $m->lessons->map(function ($l) {
                        $free = $l->is_free_preview && CourseLesson::previewable($l->type);

                        return ['is_free_preview' => $free, 'uuid' => $free ? $l->uuid : null] + $l->only(['id', 'title', 'type']);
                    })->values(),
                ])->values(),
                'instructions' => $d->instructions->pluck('text'),
                'benefits' => $d->benefits->pluck('text'),
                'highlights' => $d->highlights->pluck('text'),
                'faqs' => $d->faqs->map->only(['question', 'answer']),
                'testimonials' => $d->testimonials->map->only(['name', 'message', 'avatar_path']),
                'gallery' => $d->galleryItems->pluck('image_path'),
                'live_classes' => $d->liveClasses->map->only(['title', 'description', 'scheduled_at', 'duration_minutes']),
            ],
        ];
    }

    /**
     * GET /c/{slug}/preview/{lessonUuid} — creator ne jis lesson pe "Free preview" on kiya hai, wo bina kharide
     * khulta hai. Sirf published course ka published + free-preview lesson; baaki sab 404.
     * Quiz / assignment kabhi preview nahi hote (unke liye enrollment chahiye) — flag on ho to bhi 404.
     */
    public function preview(string $slug, string $lessonUuid)
    {
        $lesson = $this->previewLesson($slug, $lessonUuid)->load(['video', 'textContent.images', 'audio', 'notes.files']);
        $payload = $lesson->only(['uuid', 'title', 'type']) + ['content' => null];

        switch ($lesson->type) {
            case 'video':
                $payload['content'] = $lesson->video?->only(['video_url', 'notes']);
                break;
            case 'text_image':
                $payload['content'] = $lesson->textContent ? ['content' => $lesson->textContent->content, 'images' => $lesson->textContent->images->pluck('image_path')] : null;
                break;
            case 'audio':
                $payload['content'] = $lesson->audio?->only(['audio_url', 'audio_path', 'notes']);
                break;
            case 'notes_pdf':
                $note = $lesson->notes;
                $payload['content'] = $note ? [
                    'description' => $note->description,
                    'files' => $note->allow_download ? $note->files->map(fn ($file) => [
                        'name' => $file->original_name,
                        'url' => url("/c/{$slug}/preview/{$lesson->uuid}/files/{$file->uuid}"),
                    ])->values() : [],
                ] : null;
                break;
        }

        return response()->json(['lesson' => $payload]);
    }

    /** Free-preview notes lesson ki file — sirf jab creator ne downloads on rakhe hon. */
    public function previewFile(string $slug, string $lessonUuid, string $fileUuid)
    {
        $lesson = $this->previewLesson($slug, $lessonUuid)->load('notes.files');
        $file = $lesson->notes?->files->firstWhere('uuid', $fileUuid);

        abort_unless($lesson->type === 'notes_pdf' && $file && $lesson->notes->allow_download, 404);
        abort_unless(Storage::disk('local')->exists($file->file_path), 404);

        return Storage::disk('local')->download($file->file_path, $file->original_name ?: basename($file->file_path));
    }

    private function previewLesson(string $slug, string $lessonUuid): CourseLesson
    {
        $product = Product::with('courseDetail:id,product_id')
            ->where('slug', $slug)->where('type', 'course')->where('status', 'published')
            ->whereHas('creator', fn ($q) => $q->where('status', 'active'))
            ->firstOrFail();

        return CourseLesson::where('uuid', $lessonUuid)
            ->where('is_published', true)
            ->where('is_free_preview', true) // yahi asli darwaza hai — flag band to 404
            ->whereIn('type', CourseLesson::PREVIEWABLE_TYPES)
            ->whereHas('module', fn ($q) => $q->where('course_id', $product->courseDetail?->id))
            ->firstOrFail();
    }
}
