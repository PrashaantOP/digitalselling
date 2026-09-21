<?php

namespace App\Http\Controllers;

use App\Models\EventDetail;
use App\Models\Product;
use Illuminate\Validation\Rule;

class EventController extends BaseProductController
{
    protected function type(): string { return 'event'; }
    protected function param(): string { return 'event'; }
    protected function view(): string { return 'Events'; }
    protected function routeName(): string { return 'events'; }
    protected function detailModel(): ?string { return EventDetail::class; }
    protected function detailRelation(): ?string { return 'eventDetail'; }

    protected function routeIdentifier(Product $product): int|string
    {
        return $product->uuid;
    }

    protected function routeIdentifierColumn(): string
    {
        return 'uuid';
    }

    // event_details.starts_at NOT NULL hai
    protected function detailDefaults(): array
    {
        return ['mode' => 'online', 'starts_at' => now()->addWeek()->startOfHour()];
    }

    protected function detailRules(Product $product): array
    {
        return [
            'mode' => ['sometimes', Rule::in(['online', 'in_person'])],
            'starts_at' => ['sometimes', 'required', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'join_link' => ['nullable', 'url', 'max:500'],
            'venue_address' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * `products` table me registrations ka koi column nahi hai, isliye
     * event_details ke through registrations count karke Events/Index ke
     * "Attendees" column (registrations_count) ko bharte hain.
     */
    protected function listCounts(): array
    {
        return ['eventRegistrations as registrations_count'];
    }

    protected function publishProblems(Product $product): array
    {
        $d = $product->eventDetail;
        $p = [];

        if (! $d) {
            return ['event' => 'Event details are missing.'];
        }
        if ($d->mode === 'in_person' && blank($d->venue_address)) {
            $p['venue'] = 'Add the venue address for an in-person event.';
        }
        if ($d->starts_at && $d->starts_at->isPast()) {
            $p['starts_at'] = 'The event start time is in the past.';
        }

        return $p;
    }
}
