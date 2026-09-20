<?php

namespace App\Http\Controllers\Public;

use App\Models\Product;

class EventCheckoutController extends BaseProductCheckoutController
{
    protected function type(): string { return 'event'; }
    protected function view(): string { return 'Event'; }
    protected function relations(): array { return ['eventDetail']; }

    protected function extra(Product $product): array
    {
        $d = $product->eventDetail;

        // join_link sirf registered customers ko (customer portal / email) — yahan nahi
        return ['event' => [
            'mode' => $d->mode,
            'starts_at' => $d->starts_at,
            'ends_at' => $d->ends_at,
            'venue_address' => $d->mode === 'in_person' ? $d->venue_address : null,
        ]];
    }
}
