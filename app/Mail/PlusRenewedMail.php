<?php

namespace App\Mail;

use App\Models\BillingInvoice;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Creator ko — auto-renew ka charge mila (pehla ho ya har mahine ka), invoice ke link ke saath. */
class PlusRenewedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public BillingInvoice $invoice, public bool $first = false) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->first ? 'Payment received — Plus is active with auto-renew' : 'Plus renewed — payment received');
    }

    public function content(): Content
    {
        $user = $this->invoice->user;

        return new Content(markdown: 'mail.plus-renewed', with: [
            'first' => $this->first,
            'name' => $user?->name ?: 'there',
            'amount' => number_format((float) $this->invoice->amount, 2),
            'nextCharge' => $this->invoice->period_end?->copy()->setTimezone('Asia/Kolkata')->format('j F Y'),
            'invoiceNumber' => $this->invoice->invoice_number,
            'invoiceUrl' => url("/dashboard/settings/billing/invoices/{$this->invoice->uuid}"),
            'billingUrl' => url('/dashboard/settings/billing'),
        ]);
    }
}
