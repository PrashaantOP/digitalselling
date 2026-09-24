<?php

namespace App\Http\Controllers;

use App\Models\LockedContentDetail;
use App\Models\Product;
use App\Support\Tenant;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class LockedContentController extends BaseProductController
{
    /** Editor ke category dropdown ki values (labels frontend me). */
    public const CATEGORIES = ['other', 'photos', 'videos', 'audio', 'documents', 'templates', 'software'];

    protected function type(): string { return 'locked_content'; }
    protected function param(): string { return 'lockedContent'; }
    protected function view(): string { return 'LockedContent'; }
    protected function routeName(): string { return 'locked-content'; }
    protected function detailModel(): ?string { return LockedContentDetail::class; }
    protected function detailRelation(): ?string { return 'lockedContentDetail'; }

    /** Course/Event/Book ki tarah dashboard URLs me id ki jagah uuid (secure, guess nahi hoga). */
    protected function routeIdentifier(Product $product): int|string
    {
        return $product->uuid;
    }

    protected function routeIdentifierColumn(): string
    {
        return 'uuid';
    }

    protected function productDefaults(): array
    {
        return ['button_text' => 'Unlock now'];
    }

    protected function detailDefaults(): array
    {
        return ['category' => 'other', 'public_teaser' => 'Unlock this content to view it.'];
    }

    protected function detailRules(Product $product): array
    {
        return [
            'category' => ['sometimes', 'required', Rule::in(self::CATEGORIES)],
            'public_teaser' => ['nullable', 'string', 'max:255'],
            'hidden_message' => ['nullable', 'string', 'max:20000'],
            // sirf http/https — bare `url` rule javascript: aur data: URLs bhi pass kar deta hai
            'hidden_video_url' => ['nullable', 'url:http,https', 'max:500'],
        ];
    }

    /** List me "3 images · 2 files" dikhane ke liye sirf ginti — paths nahi. */
    protected function listRelations(): array
    {
        return ['lockedContentDetail' => fn ($q) => $q->withCount(['images', 'files'])];
    }

    protected function editRelations(): array
    {
        return array_merge(parent::editRelations(), ['lockedContentDetail.images', 'lockedContentDetail.files']);
    }

    protected function publishProblems(Product $product): array
    {
        $d = $product->lockedContentDetail;

        if ($d && ($d->hidden_message || $d->hidden_video_url || $d->files()->exists() || $d->images()->exists())) {
            return [];
        }

        return ['content' => 'Add the hidden content (message, images, video or files) before publishing.'];
    }

    /**
     * Base sirf detail row copy karta hai — hidden images/files ke bina copy publish hi nahi ho paati.
     * Har file ki alag private copy banao, warna copy se delete karne par original ki file bhi chali jaati.
     */
    protected function duplicateProduct(Product $source): Product
    {
        $copy = parent::duplicateProduct($source);
        $from = $source->lockedContentDetail;
        $to = $copy->lockedContentDetail;

        if (! $from || ! $to) {
            return $copy;
        }

        $disk = Storage::disk('local');
        $clone = function (string $path) use ($disk): ?string {
            $newPath = 'creators/' . Tenant::id() . '/locked/' . Str::random(40) . '.' . pathinfo($path, PATHINFO_EXTENSION);

            return $disk->exists($path) && $disk->copy($path, $newPath) ? $newPath : null;
        };

        foreach ($from->images as $image) {
            // purani public-disk wali images copy nahi hoti — sirf private (creators/...) wali
            if (str_starts_with($image->image_path, 'creators/') && ($path = $clone($image->image_path))) {
                $to->images()->create(['image_path' => $path, 'sort_order' => $image->sort_order]);
            }
        }

        foreach ($from->files as $file) {
            if ($path = $clone($file->file_path)) {
                $to->files()->create(['file_path' => $path, 'original_name' => $file->original_name]);
            }
        }

        return $copy;
    }
}
