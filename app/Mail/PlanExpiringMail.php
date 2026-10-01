<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Pro khatam hone wali hai — prepaid me auto-renew nahi hota, isliye yaad dilana zaroori hai
 * (warna creator chupchaap 15% commission pe chala jaata hai).
 */
class PlanExpiringMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $name,
        public int $daysLeft,
        public string $expiresOn,
        public float $proRate,
        public float $freeRate,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->daysLeft > 0
            ? "Your Pro plan ends in {$this->daysLeft} day" . ($this->daysLeft > 1 ? 's' : '')
            : 'Your Pro plan ends today');
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.plan-expiring', with: [
            'billingUrl' => url('/dashboard/settings/billing'),
        ]);
    }
}
