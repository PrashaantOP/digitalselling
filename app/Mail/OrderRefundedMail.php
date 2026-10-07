<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Refund ho gaya — buyer ko (paisa kab aayega) ya creator ko (kamai pe asar). */
class OrderRefundedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Order $order, public bool $forCreator = false) {}

    public function envelope(): Envelope
    {
        $title = $this->order->product?->title ?? $this->order->order_number;

        return new Envelope(subject: $this->forCreator ? "Order refunded: {$title}" : "Your refund for {$title}");
    }

    public function content(): Content
    {
        $order = $this->order;

        return new Content(markdown: 'mail.order-refunded', with: [
            'forCreator' => $this->forCreator,
            'name' => $this->forCreator ? ($order->product?->creator?->name ?: 'there') : ($order->buyer_name ?: 'there'),
            'title' => $order->product?->title ?? 'your purchase',
            'amount' => '₹' . number_format((float) $order->total_amount, 2),
            'net' => '₹' . number_format((float) $order->net_payout_amount, 2),
            'orderNumber' => $order->order_number,
            'settled' => (bool) $order->settlement_id,
            'url' => url('/dashboard/payments'),
        ]);
    }
}
