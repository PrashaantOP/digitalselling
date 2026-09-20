<?php

namespace App\Http\Controllers;

use App\Models\BookingServiceDetail;
use App\Models\Product;

/** Bookings → Sessions tab. Product type = booking. (Edit page nahi, list me inline/modal edit.) */
class BookingServiceController extends BaseProductController
{
    protected function type(): string { return 'booking'; }
    protected function param(): string { return 'service'; }
    protected function view(): string { return 'BookingSessions'; }
    protected function routeName(): string { return 'booking-services'; }
    protected function detailModel(): ?string { return BookingServiceDetail::class; }
    protected function detailRelation(): ?string { return 'bookingServiceDetail'; }

    protected function afterStoreRedirect(Product $product): ?string
    {
        return null; // back
    }

    protected function detailDefaults(): array
    {
        return ['duration_minutes' => 30, 'is_active' => true];
    }

    protected function detailRules(Product $product): array
    {
        return [
            'duration_minutes' => ['sometimes', 'integer', 'min:5', 'max:480'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

}
