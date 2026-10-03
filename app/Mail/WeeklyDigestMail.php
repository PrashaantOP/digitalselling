<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Creator ko har somvaar — pichhle 7 din ka chhota hisaab. Sirf jinhone "Weekly digest" on kiya hai. */
class WeeklyDigestMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array{from: string, to: string, sales: int, revenue: float, earned: float, enrollments: int, completions: int, top: ?string}  $stats
     */
    public function __construct(public User $creator, public array $stats) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Your week: {$this->stats['sales']} sale" . ($this->stats['sales'] === 1 ? '' : 's') . ', ₹' . number_format($this->stats['earned'], 2) . ' earned');
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.weekly-digest', with: [
            'name' => $this->creator->name ?: 'there',
            'stats' => $this->stats,
            'url' => url('/dashboard'),
        ]);
    }
}
