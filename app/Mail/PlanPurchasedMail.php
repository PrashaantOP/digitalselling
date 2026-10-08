<?php

namespace App\Mail;

use App\Models\PlanPurchase;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Creator ko — "Plus ka payment mil gaya", invoice ke link ke saath. */
class PlanPurchasedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public PlanPurchase $purchase) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Payment received — your Plus plan is active');
    }

    public function content(): Content
    {
        $invoice = $this->purchase->invoice;

        return new Content(markdown: 'mail.plan-purchased', with: [
            'name' => $this->purchase->user?->name ?: 'there',
            'months' => $this->purchase->months,
            'amount' => number_format((float) $this->purchase->amount_payable, 2),
            'validTill' => $this->purchase->period_end?->copy()->setTimezone('Asia/Kolkata')->format('j F Y'),
            'invoiceNumber' => $invoice?->invoice_number,
            'invoiceUrl' => $invoice ? url("/dashboard/settings/billing/invoices/{$invoice->uuid}") : url('/dashboard/settings/billing'),
        ]);
    }
}
