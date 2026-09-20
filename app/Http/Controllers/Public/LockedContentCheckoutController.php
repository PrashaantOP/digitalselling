<?php

namespace App\Http\Controllers\Public;

use App\Models\Product;

class LockedContentCheckoutController extends BaseProductCheckoutController
{
    protected function type(): string { return 'locked_content'; }
    protected function view(): string { return 'LockedContent'; }
    protected function relations(): array { return ['lockedContentDetail.images']; }

    protected function extra(Product $product): array
    {
        $d = $product->lockedContentDetail;

        // hidden_message / hidden_video_url / files kabhi expose nahi (unlock ke baad customer portal se)
        return ['locked' => [
            'category' => $d->category,
            'public_teaser' => $d->public_teaser,
            'images' => $d->images->sortBy('sort_order')->pluck('image_path')->values(),
        ]];
    }
}
