<?php

namespace App\Mail;

use App\Models\SubAdmin;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SubAdminInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public SubAdmin $invite,
        public string $creatorName,
        public string $token,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "{$this->creatorName} invited you to help run their store");
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.sub-admin-invite', with: [
            'url' => url("/invite/{$this->token}"),
            'role' => $this->invite->role_name,
            'days' => SubAdmin::INVITE_DAYS,
        ]);
    }
}
