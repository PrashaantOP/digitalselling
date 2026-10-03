<?php

namespace App\Http\Controllers\Public;

use App\Models\Product;

class PaymentPageCheckoutController extends BaseProductCheckoutController
{
    protected function type(): string { return 'payment_page'; }
    protected function view(): string { return 'PaymentPage'; }
    protected function relations(): array { return ['paymentPageDetail']; }

    protected function extra(Product $product): array
    {
        $d = $product->paymentPageDetail;

        return ['payment_page' => [
            'subtitle' => $d?->subtitle,
            'whats_included' => $d?->whats_included ?? [],
            // links kabhi nahi — sirf ginti, "pay ke baad itni files milengi" dikhane ke liye
            'files_count' => $d ? count($d->deliveryFiles()) : 0,
            'faqs' => $d?->faqs ?? [],
            'collect_full_name' => $d?->collect_full_name ?? true,
            'collect_note' => $d?->collect_note ?? false,
        ]];
    }
}
