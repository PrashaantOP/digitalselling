<?php

namespace App\Services;

use App\Mail\BookingConfirmedMail;
use App\Mail\NewBookingMail;
use App\Models\Booking;
use App\Support\CalendarLink;
use Illuminate\Support\Facades\Mail;

/**
 * "Booking confirmed" (customer) + "New booking" (creator) mails. Free session pe booking bante hi,
 * paid session pe payment success ke baad (OrderService::fulfil) — dono yahin se.
 */
class BookingNotifier
{
    public function calendarUrl(Booking $booking): string
    {
        $booking->loadMissing(['service.product:id,title,creator_id', 'creator:id,name,email']);
        $title = $booking->service?->product?->title ?? 'Session';

        return CalendarLink::google(
            "{$title} with {$booking->creator?->name}",
            $booking->scheduled_at,
            $booking->duration_minutes,
            $booking->meeting_link ? "Join: {$booking->meeting_link}" : null,
            $booking->meeting_link,
        );
    }

    /** Mail fail ho to booking fail nahi honi chahiye — sirf report karo. */
    public function confirmed(Booking $booking): void
    {
        $booking->loadMissing(['customer', 'responses', 'service.product:id,title,creator_id', 'creator:id,name,email']);

        $title = $booking->service?->product?->title ?? 'Session';
        $creator = $booking->creator;
        $timezone = SlotService::timezoneFor($booking->creator_id);

        try {
            if ($booking->customer?->email) {
                Mail::to($booking->customer->email)->send(new BookingConfirmedMail($booking, $title, (string) $creator?->name, $timezone, $this->calendarUrl($booking)));
            }
        } catch (\Throwable $e) {
            report($e);
        }

        try {
            if ($creator) {
                Mail::to($creator->email)->send(new NewBookingMail($booking, $title, $timezone));
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
