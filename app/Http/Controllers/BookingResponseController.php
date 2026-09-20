<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Services\SlotService;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Responses tab: booking ke waqt customer ne jo checkout-sawaalon ke jawab diye. */
class BookingResponseController extends Controller
{
    public function index(Request $request)
    {
        $bookings = SlotService::confirmed(Booking::query())
            ->with(['responses', 'customer:id,name,email,phone', 'service.product:id,title'])
            ->where('creator_id', \App\Support\Tenant::id())
            ->has('responses')
            ->latest('scheduled_at')->paginate(20)->withQueryString();

        return Inertia::render('Bookings/Responses', ['bookings' => $bookings]);
    }
}
