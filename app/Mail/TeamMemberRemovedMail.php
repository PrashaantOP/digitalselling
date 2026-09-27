<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TeamMemberRemovedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $name, public string $storeName) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Your access to {$this->storeName}'s store was removed");
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.team-member-removed');
    }
}
