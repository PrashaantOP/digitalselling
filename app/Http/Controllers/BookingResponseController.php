<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Services\SlotService;
use App\Support\Tenant;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Responses tab: booking ke waqt customer ne jo checkout-sawaalon ke jawab diye. */
class BookingResponseController extends Controller
{
    public function index(Request $request)
    {
        $uid = Tenant::id();

        $bookings = SlotService::confirmed(Booking::query())
            ->with([
                'responses:id,booking_id,question_label,answer',
                'customer:id,name,email,phone',
                'service.product' => fn ($q) => $q->withTrashed()->select('id', 'title'),
            ])
            ->where('creator_id', $uid)
            ->has('responses')
            ->latest('scheduled_at')->paginate(20)->withQueryString()
            ->through(fn (Booking $b) => [
                'id' => $b->id,
                'uuid' => $b->uuid,
                'scheduled_at' => $b->scheduled_at->toIso8601String(),
                'status' => $b->status,
                'session' => $b->service?->product?->title ?? 'Deleted session',
                'customer' => $b->customer?->only(['name', 'email', 'phone']),
                'responses' => $b->responses->map->only(['question_label', 'answer'])->values(),
            ]);

        return Inertia::render('Bookings/Responses', [
            'bookings' => $bookings,
            'timezone' => SlotService::timezoneFor($uid),
        ]);
    }
}
