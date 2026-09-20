<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\AvailabilityException;
use App\Models\CreatorAvailability;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class BookingAvailabilityController extends Controller
{
    use RespondsFlexibly;

    public function edit()
    {
        $uid = $this->tid();
        $rows = CreatorAvailability::where('user_id', $uid)->get()->keyBy('weekday');

        // hamesha 7 din (0 = Sunday .. 6 = Saturday) return karo
        $week = collect(range(0, 6))->map(fn ($d) => [
            'weekday' => $d,
            'is_enabled' => (bool) ($rows[$d]->is_enabled ?? false),
            'start_time' => isset($rows[$d]) ? substr((string) $rows[$d]->start_time, 0, 5) : '09:00',
            'end_time' => isset($rows[$d]) ? substr((string) $rows[$d]->end_time, 0, 5) : '17:00',
        ]);

        return Inertia::render('Bookings/Settings', [
            'timezone' => $rows->first()->timezone ?? 'Asia/Kolkata',
            'week' => $week,
            'exceptions' => AvailabilityException::where('user_id', $uid)->whereDate('date', '>=', now()->toDateString())->orderBy('date')->get(),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'timezone' => ['required', 'timezone'],
            'week' => ['required', 'array', 'size:7'],
            'week.*.weekday' => ['required', 'integer', 'between:0,6', 'distinct'],
            'week.*.is_enabled' => ['required', 'boolean'],
            'week.*.start_time' => ['nullable', 'date_format:H:i', 'required_if:week.*.is_enabled,true'],
            'week.*.end_time' => ['nullable', 'date_format:H:i', 'required_if:week.*.is_enabled,true', 'after:week.*.start_time'],
        ]);

        DB::transaction(function () use ($data) {
            foreach ($data['week'] as $day) {
                CreatorAvailability::updateOrCreate(
                    ['user_id' => $this->tid(), 'weekday' => $day['weekday']],
                    [
                        'timezone' => $data['timezone'],
                        'is_enabled' => $day['is_enabled'],
                        'start_time' => $day['start_time'] ?? null,
                        'end_time' => $day['end_time'] ?? null,
                    ]
                );
            }
        });

        return $this->done($request, 'Availability saved.');
    }
}
