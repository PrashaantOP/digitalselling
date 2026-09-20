<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Booking;
use App\Services\SlotService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class BookingController extends Controller
{
    use RespondsFlexibly;

    public function index(Request $request)
    {
        $tab = $request->query('status');

        $bookings = SlotService::confirmed(Booking::query())
            ->with(['service.product:id,title', 'customer:id,name,email,phone'])
            ->where('creator_id', $this->tid())
            ->when($tab === 'upcoming', fn ($q) => $q->where('status', 'upcoming')->orderBy('scheduled_at'))
            ->when($tab && $tab !== 'upcoming', fn ($q) => $q->where('status', $tab)->orderByDesc('scheduled_at'))
            ->when(! $tab, fn ($q) => $q->orderByDesc('scheduled_at'))
            ->paginate(20)->withQueryString();

        return Inertia::render('Bookings/Index', ['bookings' => $bookings, 'filters' => ['status' => $tab]]);
    }

    /** complete / cancel / no-show — sirf upcoming booking ka status badal sakte hain. */
    public function updateStatus(Request $request, Booking $booking)
    {
        $data = $request->validate(['status' => ['required', Rule::in(['completed', 'cancelled', 'no_show'])]]);

        abort_unless($booking->status === 'upcoming', 422, 'Only upcoming bookings can be updated.');

        $booking->update($data);

        return $this->done($request, 'Booking updated.', ['status' => $booking->status]);
    }
}
