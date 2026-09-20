<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Services\SlotService;
use Inertia\Inertia;

class MyBookingsController extends Controller
{
    use ResolvesCustomer;

    public function index()
    {
        $bookings = SlotService::confirmed(Booking::query())
            ->with(['service.product:id,title', 'creator:id,name,username', 'responses'])
            ->whereIn('customer_id', $this->customerIds())
            ->orderByDesc('scheduled_at')->get();

        return Inertia::render('Customer/MyBookings', [
            'upcoming' => $bookings->where('status', 'upcoming')->where('scheduled_at', '>=', now())->sortBy('scheduled_at')->values(),
            'past' => $bookings->filter(fn ($b) => $b->status !== 'upcoming' || $b->scheduled_at < now())->values(),
        ]);
    }
}
