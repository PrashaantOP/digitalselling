<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Creator ko — "nayi booking aayi". */
class NewBookingMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Booking $booking,
        public string $sessionTitle,
        public string $timezone,
    ) {}

    public function envelope(): Envelope
    {
        $who = $this->booking->customer?->name ?: 'Someone';

        return new Envelope(subject: "New booking: {$who} booked {$this->sessionTitle}");
    }

    public function content(): Content
    {
        $start = $this->booking->scheduled_at->copy()->setTimezone($this->timezone);

        return new Content(markdown: 'mail.new-booking', with: [
            'customer' => $this->booking->customer,
            'when' => $start->format('l, j F Y') . ' · ' . $start->format('g:i a') . " ({$this->timezone})",
            'duration' => $this->booking->duration_minutes,
            'responses' => $this->booking->responses,
            'meetingLink' => $this->booking->meeting_link,
            'dashboardUrl' => url('/dashboard/bookings'),
        ]);
    }
}
