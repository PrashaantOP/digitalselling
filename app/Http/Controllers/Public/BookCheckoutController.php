<?php

namespace App\Http\Controllers\Public;

use App\Models\Product;

class BookCheckoutController extends BaseProductCheckoutController
{
    protected function type(): string { return 'book'; }
    protected function view(): string { return 'Book'; }
    protected function relations(): array { return ['bookDetail']; }

    protected function extra(Product $product): array
    {
        $d = $product->bookDetail;

        // file_path / external_link jaan-bujh ke nahi — wo sirf buyer ko download route se milte hain
        return ['book' => [
            'author_name' => $d?->author_name,
            'subtitle' => $d?->subtitle,
            'pages' => $d?->pages,
            'format' => $d?->format ?? 'pdf',
            'whats_inside' => $d?->whats_inside ?? [],
            'faqs' => $d?->faqs ?? [],
        ]];
    }
}
