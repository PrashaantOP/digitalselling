<?php

namespace App\Mail;

use App\Services\LoginOtpService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LoginOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $code,
        public string $name,
        public string $purpose,
        public ?string $ip,
        public string $userAgent,
    ) {}

    public function envelope(): Envelope
    {
        $what = match (true) {
            str_starts_with($this->purpose, 'admin') => 'Admin sign-in',
            str_starts_with($this->purpose, 'customer') => 'Your purchases — sign-in',
            default => 'Sign-in',
        };

        return new Envelope(subject: "{$what} code: {$this->code}");
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.login-otp', with: [
            'minutes' => LoginOtpService::TTL_MINUTES,
            'isSetup' => $this->purpose === 'creator_2fa_setup',
            'isCustomer' => str_starts_with($this->purpose, 'customer'),
        ]);
    }
}
