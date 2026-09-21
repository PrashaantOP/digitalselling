<?php

namespace App\Http\Controllers;

use App\Models\CourseDetail;
use App\Models\Product;
use App\Services\CourseContentService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CourseController extends BaseProductController
{
    protected function type(): string { return 'course'; }
    protected function param(): string { return 'course'; }
    protected function view(): string { return 'Courses'; }
    protected function routeName(): string { return 'courses'; }
    protected function detailModel(): ?string { return CourseDetail::class; }
    protected function detailRelation(): ?string { return 'courseDetail'; }

    /** Events ki tarah dashboard URLs me id ki jagah uuid (secure, guess nahi hoga). */
    protected function routeIdentifier(Product $product): int|string
    {
        return $product->uuid;
    }

    protected function routeIdentifierColumn(): string
    {
        return 'uuid';
    }

    protected function detailRules(Product $product): array
    {
        return [
            'access_type' => ['sometimes', Rule::in(['lifetime', 'days'])],
            'access_days' => ['nullable', 'integer', 'min:1', 'max:3650', 'required_if:access_type,days'],
            'certificate_enabled' => ['sometimes', 'boolean'],
        ];
    }

    protected function editRelations(): array
    {
        return [
            'courseDetail.modules' => fn ($q) => $q->orderBy('sort_order'),
            'courseDetail.modules.lessons' => fn ($q) => $q->orderBy('sort_order'),
            'courseDetail.modules.lessons.video',
            'courseDetail.modules.lessons.textContent.images',
            'courseDetail.modules.lessons.audio',
            'courseDetail.modules.lessons.notes.files',
            'courseDetail.modules.lessons.assignment',
            'courseDetail.modules.lessons.quiz.questions.options',
            'courseDetail.instructions' => fn ($q) => $q->orderBy('sort_order'),
            'courseDetail.benefits' => fn ($q) => $q->orderBy('sort_order'),
            'courseDetail.faqs' => fn ($q) => $q->orderBy('sort_order'),
            'courseDetail.testimonials' => fn ($q) => $q->orderBy('sort_order'),
            'courseDetail.highlights' => fn ($q) => $q->orderBy('sort_order'),
            'courseDetail.galleryItems' => fn ($q) => $q->orderBy('sort_order'),
            'courseDetail.liveClasses' => fn ($q) => $q->orderBy('scheduled_at'),
            'coverImages',
            'coupons',
            'checkoutQuestions',
            'addons.addonProduct:id,title,type,price',
        ];
    }

    protected function publishProblems(Product $product): array
    {
        $lessons = $product->courseDetail
            ? \App\Models\CourseLesson::whereHas('module', fn ($q) => $q->where('course_id', $product->courseDetail->id))->where('is_published', true)->count()
            : 0;

        return $lessons < 1 ? ['lessons' => 'Add at least one published lesson before publishing the course.'] : [];
    }

    /** Course = deep copy: modules → lessons → type-specific content → quiz + sections. */
    protected function duplicateProduct(Product $source): Product
    {
        $copy = parent::duplicateProduct($source);

        DB::transaction(function () use ($source, $copy) {
            $old = $source->courseDetail;
            $new = $copy->courseDetail;

            if (! $old || ! $new) {
                return;
            }

            foreach ($old->modules()->orderBy('sort_order')->get() as $module) {
                $newModule = $module->replicate();
                $newModule->course_id = $new->id;
                $newModule->save();

                foreach ($module->lessons()->orderBy('sort_order')->get() as $lesson) {
                    $newLesson = $lesson->replicate();
                    $newLesson->module_id = $newModule->id;
                    $newLesson->save();

                    $this->copyLessonContent($lesson, $newLesson);
                }
            }

            // sections (files bhi copy — taaki ek delete hone pe dusra na toote)
            foreach (['instructions', 'benefits', 'faqs', 'highlights'] as $rel) {
                foreach ($old->{$rel} as $row) {
                    $c = $row->replicate();
                    $c->course_id = $new->id;
                    $c->save();
                }
            }
            foreach ($old->testimonials as $row) {
                $c = $row->replicate();
                $c->course_id = $new->id;
                $c->avatar_path = $this->cloneFile($row->avatar_path, 'public');
                $c->save();
            }
            foreach ($old->galleryItems as $row) {
                $c = $row->replicate();
                $c->course_id = $new->id;
                $c->image_path = $this->cloneFile($row->image_path, 'public');
                $c->save();
            }

            CourseContentService::recount($new->id);
        });

        return $copy;
    }

    private function copyLessonContent($lesson, $newLesson): void
    {
        foreach (['video', 'assignment'] as $rel) {
            if ($d = $lesson->{$rel}) {
                $c = $d->replicate();
                $c->lesson_id = $newLesson->id;
                $c->save();
            }
        }

        if ($a = $lesson->audio) {
            $c = $a->replicate();
            $c->lesson_id = $newLesson->id;
            $c->audio_path = $this->cloneFile($a->audio_path, 'public');
            $c->save();
        }

        if ($t = $lesson->textContent) {
            $c = $t->replicate();
            $c->lesson_id = $newLesson->id;
            $c->save();
            foreach ($t->images as $img) {
                $ci = $img->replicate();
                $ci->lesson_text_content_id = $c->id;
                $ci->image_path = $this->cloneFile($img->image_path, 'public');
                $ci->save();
            }
        }

        if ($n = $lesson->notes) {
            $c = $n->replicate();
            $c->lesson_id = $newLesson->id;
            $c->save();
            foreach ($n->files as $f) {
                $cf = $f->replicate();
                $cf->lesson_note_id = $c->id;
                $cf->file_path = $this->cloneFile($f->file_path, 'local');
                $cf->save();
            }
        }

        if ($q = $lesson->quiz) {
            $nq = $q->replicate();
            $nq->lesson_id = $newLesson->id;
            $nq->save();
            foreach ($q->questions()->with('options')->get() as $question) {
                $nqq = $question->replicate();
                $nqq->quiz_id = $nq->id;
                $nqq->question_image_path = $this->cloneFile($question->question_image_path, 'public');
                $nqq->save();
                foreach ($question->options as $opt) {
                    $no = $opt->replicate();
                    $no->question_id = $nqq->id;
                    $no->option_image_path = $this->cloneFile($opt->option_image_path, 'public');
                    $no->save();
                }
            }
        }
    }

    private function cloneFile(?string $path, string $disk): ?string
    {
        if (! $path || ! Storage::disk($disk)->exists($path)) {
            return null;
        }

        $new = dirname($path) . '/' . Str::random(20) . '.' . pathinfo($path, PATHINFO_EXTENSION);
        Storage::disk($disk)->copy($path, $new);

        return $new;
    }
}
