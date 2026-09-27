<?php

namespace App\Support;

use Carbon\CarbonInterface;

/** "Add to Google Calendar" link — koi API nahi, sirf template URL. Mail aur booking page dono yahi use karte hain. */
class CalendarLink
{
    public static function google(string $title, CarbonInterface $start, int $minutes, ?string $details = null, ?string $location = null): string
    {
        $format = fn (CarbonInterface $t) => $t->copy()->utc()->format('Ymd\THis\Z');

        return 'https://calendar.google.com/calendar/render?' . http_build_query(array_filter([
            'action' => 'TEMPLATE',
            'text' => $title,
            'dates' => $format($start) . '/' . $format($start->copy()->addMinutes($minutes)),
            'details' => $details,
            'location' => $location,
        ]));
    }
}
