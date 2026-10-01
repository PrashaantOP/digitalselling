<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Creator ko — nayi sale. "Payment received" notification band ho to OrderService bhejta hi nahi. */
class NewSaleMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Order $order) {}

    public function envelope(): Envelope
    {
        $amount = (float) $this->order->total_amount > 0 ? '₹' . number_format((float) $this->order->total_amount, 2) : 'Free';

        return new Envelope(subject: "New sale: {$amount} — " . ($this->order->product?->title ?? $this->order->order_number));
    }

    public function content(): Content
    {
        $order = $this->order;

        return new Content(markdown: 'mail.new-sale', with: [
            'name' => $order->product?->creator?->name ?: 'there',
            'title' => $order->product?->title ?? 'your product',
            'buyer' => $order->buyer_name ?: $order->buyer_email,
            'buyerEmail' => $order->buyer_email,
            'total' => number_format((float) $order->total_amount, 2),
            'fee' => number_format((float) $order->platform_fee, 2),
            'net' => number_format((float) $order->net_payout_amount, 2),
            'orderNumber' => $order->order_number,
            'url' => url('/dashboard/payments'),
        ]);
    }
}
