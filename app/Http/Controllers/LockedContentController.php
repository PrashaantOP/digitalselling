<?php

namespace App\Http\Controllers;

use App\Models\LockedContentDetail;
use App\Models\Product;

class LockedContentController extends BaseProductController
{
    protected function type(): string { return 'locked_content'; }
    protected function param(): string { return 'lockedContent'; }
    protected function view(): string { return 'LockedContent'; }
    protected function routeName(): string { return 'locked-content'; }
    protected function detailModel(): ?string { return LockedContentDetail::class; }
    protected function detailRelation(): ?string { return 'lockedContentDetail'; }

    protected function detailDefaults(): array
    {
        return ['category' => 'other'];
    }

    protected function detailRules(Product $product): array
    {
        return [
            'category' => ['sometimes', 'required', 'string', 'max:50'],
            'public_teaser' => ['nullable', 'string', 'max:255'],
            'hidden_message' => ['nullable', 'string', 'max:20000'],
            'hidden_video_url' => ['nullable', 'url', 'max:500'],
        ];
    }

    protected function editRelations(): array
    {
        return array_merge(parent::editRelations(), ['lockedContentDetail.images', 'lockedContentDetail.files']);
    }

    protected function publishProblems(Product $product): array
    {
        $d = $product->lockedContentDetail;

        if ($d && ($d->hidden_message || $d->hidden_video_url || $d->files()->exists())) {
            return [];
        }

        return ['content' => 'Add the hidden content (message, video or files) before publishing.'];
    }
}
