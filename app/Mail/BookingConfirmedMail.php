<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Customer ko — "aapki booking confirm ho gayi". */
class BookingConfirmedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Booking $booking,
        public string $sessionTitle,
        public string $creatorName,
        public string $timezone,
        public string $calendarUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Booking confirmed: {$this->sessionTitle} with {$this->creatorName}");
    }

    public function content(): Content
    {
        $start = $this->booking->scheduled_at->copy()->setTimezone($this->timezone);

        return new Content(markdown: 'mail.booking-confirmed', with: [
            'name' => $this->booking->customer?->name ?: 'there',
            'when' => $start->format('l, j F Y') . ' · ' . $start->format('g:i a') . ' – ' . $start->copy()->addMinutes($this->booking->duration_minutes)->format('g:i a'),
            'duration' => $this->booking->duration_minutes,
            'meetingLink' => $this->booking->meeting_link,
        ]);
    }
}
