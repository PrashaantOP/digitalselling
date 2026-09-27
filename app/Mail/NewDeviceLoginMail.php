<?php

namespace App\Mail;

use App\Support\DeviceTracker;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;

class NewDeviceLoginMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $name,
        public ?string $ip,
        public string $userAgent,
        public Carbon $at,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'New sign-in to your account');
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.new-device-login', with: [
            'device' => DeviceTracker::describe($this->userAgent),
            'when' => $this->at->copy()->setTimezone('Asia/Kolkata')->format('j M Y, g:i a') . ' IST',
            'securityUrl' => url('/settings/security'),
            'passwordUrl' => url('/settings/password'),
        ]);
    }
}
