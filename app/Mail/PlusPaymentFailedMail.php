<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Creator ko — Plus ka auto-debit fail. `halted` = Razorpay ne retry band kar diye, ab khud dobara subscribe karna hai. */
class PlusPaymentFailedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user, public bool $halted = false) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->halted ? 'Plus auto-renew has stopped — action needed' : 'We could not charge your Plus renewal');
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.plus-payment-failed', with: [
            'halted' => $this->halted,
            'name' => $this->user->name ?: 'there',
            'expiresOn' => $this->user->plan_expires_at?->copy()->setTimezone('Asia/Kolkata')->format('j F Y'),
            'billingUrl' => url('/dashboard/settings/billing'),
        ]);
    }
}
