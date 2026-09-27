<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Booking;
use App\Services\SlotService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class BookingController extends Controller
{
    use RespondsFlexibly;

    private const STATUSES = ['upcoming', 'completed', 'cancelled', 'no_show'];

    public function index(Request $request)
    {
        $uid = $this->tid();
        $tab = in_array($request->query('status'), [...self::STATUSES, 'all'], true) ? $request->query('status') : 'upcoming';
        $search = trim((string) $request->query('search'));
        $timezone = SlotService::timezoneFor($uid);

        $base = fn (): Builder => SlotService::confirmed(Booking::query())->where('creator_id', $uid);

        $bookings = $base()
            ->with([
                // session delete (soft) ho jaye tab bhi purani bookings pe title dikhna chahiye
                'service.product' => fn ($q) => $q->withTrashed()->select('id', 'title'),
                'customer:id,name,email,phone',
                'order:id,order_number,total_amount,status',
                'responses:id,booking_id,question_label,answer',
            ])
            ->when($tab !== 'all', fn ($q) => $q->where('status', $tab))
            ->when($search !== '', fn ($q) => $q->whereHas('customer', fn ($c) => $c->where(fn ($s) => $s
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%"))))
            // upcoming: sabse paas wali pehle (jo time nikal gaya par mark nahi hui wo sabse upar)
            ->when($tab === 'upcoming', fn ($q) => $q->orderBy('scheduled_at'), fn ($q) => $q->orderByDesc('scheduled_at'))
            ->paginate(20)->withQueryString()
            ->through(fn (Booking $b) => [
                'id' => $b->id,
                'uuid' => $b->uuid,
                'scheduled_at' => $b->scheduled_at->toIso8601String(),
                'duration_minutes' => $b->duration_minutes,
                'status' => $b->status,
                'meeting_link' => $b->meeting_link ?? $b->service?->default_meeting_link,
                'session' => $b->service?->product?->title ?? 'Deleted session',
                'customer' => $b->customer?->only(['name', 'email', 'phone']),
                'order' => $b->order?->only(['order_number', 'total_amount', 'status']),
                'responses' => $b->responses->map->only(['question_label', 'answer'])->values(),
            ]);

        $now = now($timezone);
        $monthStart = $now->copy()->startOfMonth()->utc();
        $between = fn (string $status, $from, $to) => $base()->where('status', $status)->whereBetween('scheduled_at', [$from, $to])->count();

        return Inertia::render('Bookings/Index', [
            'bookings' => $bookings,
            'counts' => $base()->select('status', DB::raw('COUNT(*) as total'))->groupBy('status')->pluck('total', 'status'),
            'stats' => [
                'today' => $between('upcoming', $now->copy()->startOfDay()->utc(), $now->copy()->endOfDay()->utc()),
                'next_7_days' => $between('upcoming', now(), now()->addDays(7)),
                'completed_this_month' => $between('completed', $monthStart, now()),
                'no_show_this_month' => $between('no_show', $monthStart, now()),
            ],
            'timezone' => $timezone,
            'filters' => ['status' => $tab, 'search' => $search ?: null],
        ]);
    }

    /** complete / cancel / no-show — sirf upcoming booking ka status badal sakte hain. */
    public function updateStatus(Request $request, Booking $booking)
    {
        $data = $request->validate(['status' => ['required', Rule::in(['completed', 'cancelled', 'no_show'])]]);

        abort_unless($booking->status === 'upcoming', 422, 'Only upcoming bookings can be updated.');

        $booking->update($data);

        return $this->done($request, 'Booking updated.', ['status' => $booking->status]);
    }

    /** Is ek booking ka meet link — session ke default link ko override karta hai. Khaali = default pe wapas. */
    public function updateMeetingLink(Request $request, Booking $booking)
    {
        $data = $request->validate(['meeting_link' => ['nullable', 'url:http,https', 'max:500']]);

        $booking->update(['meeting_link' => $data['meeting_link'] ?? null]);

        return $this->done($request, 'Meeting link saved.');
    }
}
