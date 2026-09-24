<?php

namespace App\Http\Controllers\Public;

use App\Models\Product;

class LockedContentCheckoutController extends BaseProductCheckoutController
{
    protected function type(): string { return 'locked_content'; }
    protected function view(): string { return 'LockedContent'; }
    protected function relations(): array { return ['lockedContentDetail' => fn ($q) => $q->withCount(['images', 'files'])]; }

    protected function extra(Product $product): array
    {
        $d = $product->lockedContentDetail;

        // hidden_message / video URL / image & file paths kabhi expose nahi — sirf kya-kya milega uski ginti
        return ['locked' => [
            'category' => $d?->category ?? 'other',
            'public_teaser' => $d?->public_teaser,
            'has_message' => filled($d?->hidden_message),
            'has_video' => filled($d?->hidden_video_url),
            'image_count' => (int) ($d?->images_count ?? 0),
            'file_count' => (int) ($d?->files_count ?? 0),
        ]];
    }
}
