<?php

namespace App\Http\Controllers;

use App\Models\BookDetail;
use App\Models\Product;
use App\Support\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class BookController extends BaseProductController
{
    protected function type(): string { return 'book'; }
    protected function param(): string { return 'book'; }
    protected function view(): string { return 'Books'; }
    protected function routeName(): string { return 'books'; }
    protected function detailModel(): ?string { return BookDetail::class; }
    protected function detailRelation(): ?string { return 'bookDetail'; }

    /** Course/Event ki tarah dashboard URLs me id ki jagah uuid (secure, guess nahi hoga). */
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
        return ['button_text' => 'Buy & Download'];
    }

    protected function detailRules(Product $product): array
    {
        return [
            'author_name' => ['nullable', 'string', 'max:150'],
            'subtitle' => ['nullable', 'string', 'max:150'],
            'pages' => ['nullable', 'integer', 'min:1', 'max:20000'],
            'format' => ['sometimes', Rule::in(['pdf', 'epub', 'mobi', 'zip'])],
            'external_link' => ['nullable', 'url', 'max:500'],
            'whats_inside' => ['nullable', 'array', 'max:20'],
            'whats_inside.*' => ['nullable', 'string', 'max:150'],
            'faqs' => ['nullable', 'array', 'max:20'],
            'faqs.*.question' => ['nullable', 'string', 'max:200'],
            'faqs.*.answer' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /** Editor adhoore (khali) points/FAQs bhi bhej deta hai jab creator type kar raha ho — DB me sirf bhare hue jaate hain. */
    protected function saveDetail(Product $product, array $detailData, Request $request): void
    {
        if (array_key_exists('whats_inside', $detailData)) {
            $points = collect($detailData['whats_inside'] ?? [])->map(fn ($p) => trim((string) $p))->filter()->values();
            $detailData['whats_inside'] = $points->isEmpty() ? null : $points->all();
        }

        if (array_key_exists('faqs', $detailData)) {
            $faqs = collect($detailData['faqs'] ?? [])
                ->map(fn ($f) => ['question' => trim((string) ($f['question'] ?? '')), 'answer' => trim((string) ($f['answer'] ?? ''))])
                ->filter(fn ($f) => $f['question'] !== '')
                ->values();
            $detailData['faqs'] = $faqs->isEmpty() ? null : $faqs->all();
        }

        parent::saveDetail($product, $detailData, $request);
    }

    protected function publishProblems(Product $product): array
    {
        $d = $product->bookDetail;

        return ($d && ($d->file_path || $d->external_link))
            ? []
            : ['file' => 'Upload the book file or add a download link before publishing.'];
    }

    /**
     * Copy ko apni alag file chahiye — same file_path share hua to copy pe "remove file"
     * dabane se original book ki file bhi disk se delete ho jaati (BookFileController::deletePrivate).
     */
    protected function duplicateProduct(Product $source): Product
    {
        $copy = parent::duplicateProduct($source);
        $detail = $copy->bookDetail;

        if ($detail?->file_path) {
            $disk = Storage::disk('local');
            $newPath = 'creators/' . Tenant::id() . '/books/' . Str::random(40) . '.' . pathinfo($detail->file_path, PATHINFO_EXTENSION);

            $detail->file_path = $disk->exists($detail->file_path) && $disk->copy($detail->file_path, $newPath) ? $newPath : null;
            $detail->save();
        }

        return $copy;
    }
}
