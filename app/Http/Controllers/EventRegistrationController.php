<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\EventRegistration;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EventRegistrationController extends Controller
{
    use RespondsFlexibly;

    public function index(Request $request, Product $event)
    {
        $registrations = EventRegistration::with('customer:id,name,email,phone')
            ->where('event_id', $event->eventDetail->id)
            ->when($request->query('search'), fn ($q, $v) => $q->whereHas('customer', fn ($c) => $c
                ->where('name', 'like', "%{$v}%")->orWhere('email', 'like', "%{$v}%")->orWhere('phone', 'like', "%{$v}%")))
            ->latest('registered_at')->paginate(25)->withQueryString();

        return Inertia::render('Events/Attendees', [
            'event' => $event->load('eventDetail'),
            'registrations' => $registrations,
            'totals' => [
                'registered' => EventRegistration::where('event_id', $event->eventDetail->id)->count(),
                'attended' => EventRegistration::where('event_id', $event->eventDetail->id)->where('attended', true)->count(),
            ],
            'filters' => $request->only('search'),
        ]);
    }

    /** Attended toggle — body me `attended` na ho to flip karta hai. */
    public function update(Request $request, EventRegistration $registration)
    {
        $registration->update(['attended' => $request->has('attended') ? $request->boolean('attended') : ! $registration->attended]);

        return $this->done($request, 'Attendance updated.', ['attended' => $registration->attended]);
    }
}
