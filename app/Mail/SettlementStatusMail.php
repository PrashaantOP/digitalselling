<?php

namespace App\Mail;

use App\Models\Settlement;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Creator ko — settlement ka paisa bank me bhej diya gaya (UTR ke saath), ya transfer fail hua. */
class SettlementStatusMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Settlement $settlement) {}

    public function envelope(): Envelope
    {
        $amount = '₹' . number_format((float) $this->settlement->net_amount, 2);

        return new Envelope(subject: $this->settlement->status === 'paid'
            ? "{$amount} has been sent to your account"
            : "Your payout of {$amount} could not be sent");
    }

    public function content(): Content
    {
        $method = $this->settlement->payoutMethod;

        return new Content(markdown: 'mail.settlement-status', with: [
            'name' => $this->settlement->creator?->name ?: 'there',
            'paid' => $this->settlement->status === 'paid',
            'number' => $this->settlement->number,
            'amount' => number_format((float) $this->settlement->net_amount, 2),
            'orders' => $this->settlement->orders_count,
            'reference' => $this->settlement->reference_number,
            'reason' => $this->settlement->failure_reason,
            // poora account number mail me nahi — sirf aakhri 4
            'destination' => $method ? ($method->type === 'upi' ? $method->upi_id : 'bank account ending ' . substr((string) $method->account_number, -4)) : null,
            'url' => url("/dashboard/settlements/{$this->settlement->uuid}"),
        ]);
    }
}
