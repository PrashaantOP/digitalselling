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

        return ['book' => ['author_name' => $d->author_name, 'pages' => $d->pages, 'format' => $d->format]];
    }
}
