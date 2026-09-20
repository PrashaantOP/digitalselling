<?php

namespace App\Http\Controllers\Public;

use App\Models\Product;

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
                    'lessons' => $m->lessons->map->only(['id', 'title', 'type', 'is_free_preview'])->values(),
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
}
