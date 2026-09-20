<?php

namespace App\Http\Controllers;

use App\Models\BookDetail;
use App\Models\Product;
use Illuminate\Validation\Rule;

class BookController extends BaseProductController
{
    protected function type(): string { return 'book'; }
    protected function param(): string { return 'book'; }
    protected function view(): string { return 'Books'; }
    protected function routeName(): string { return 'books'; }
    protected function detailModel(): ?string { return BookDetail::class; }
    protected function detailRelation(): ?string { return 'bookDetail'; }

    protected function detailRules(Product $product): array
    {
        return [
            'author_name' => ['nullable', 'string', 'max:150'],
            'pages' => ['nullable', 'integer', 'min:1', 'max:20000'],
            'format' => ['sometimes', Rule::in(['pdf', 'epub', 'other'])],
            'external_link' => ['nullable', 'url', 'max:500'],
        ];
    }

    protected function publishProblems(Product $product): array
    {
        $d = $product->bookDetail;

        return ($d && ($d->file_path || $d->external_link))
            ? []
            : ['file' => 'Upload the book file or add a download link before publishing.'];
    }
}
