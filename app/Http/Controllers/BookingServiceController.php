<?php

namespace App\Http\Controllers;

use App\Models\BookingServiceDetail;
use App\Models\Product;
use App\Services\SlotService;
use Illuminate\Http\Request;

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

    /** Create drawer se duration / meet link bhi aate hain — store() validate karke yahan rakhta hai. */
    private array $createDetails = [];

    public function store(Request $request)
    {
        $this->createDetails = $request->validate([
            'duration_minutes' => ['sometimes', 'integer', 'min:5', 'max:480'],
            'default_meeting_link' => ['nullable', 'url:http,https', 'max:500'],
        ]);

        return parent::store($request);
    }

    protected function detailDefaults(): array
    {
        return $this->createDetails + ['duration_minutes' => 30, 'is_active' => true];
    }

    protected function detailRules(Product $product): array
    {
        return [
            'duration_minutes' => ['sometimes', 'integer', 'min:5', 'max:480'],
            // sirf http/https — javascript: jaise links buyer ko bhejne layak nahi
            'default_meeting_link' => ['nullable', 'url:http,https', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    protected function listCounts(): array
    {
        return [
            'bookings as upcoming_count' => fn ($q) => SlotService::confirmed($q)
                ->where('bookings.status', 'upcoming')->where('bookings.scheduled_at', '>=', now()),
        ];
    }

}
