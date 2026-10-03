<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Buyer ko — "kharid ho gayi", aur apni cheez kholne ka link (login OTP se hota hai, link me koi token nahi). */
class OrderReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Order $order) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your purchase: ' . ($this->order->product?->title ?? 'order ' . $this->order->order_number));
    }

    public function content(): Content
    {
        $order = $this->order;

        return new Content(markdown: 'mail.order-receipt', with: [
            'name' => $order->buyer_name ?: 'there',
            'title' => $order->product?->title ?? 'Your purchase',
            'creatorName' => $order->product?->creator?->name,
            'addons' => $order->addonItems->map(fn ($item) => $item->addonProduct?->title)->filter()->values(),
            'amount' => (float) $order->total_amount > 0 ? '₹' . number_format((float) $order->total_amount, 2) : 'Free',
            'orderNumber' => $order->order_number,
            'note' => $order->product?->post_purchase_message,
            // payment page ki files seedha mail me — buyer ko login kiye bina mil jaayein
            'files' => $order->product?->type === 'payment_page' ? ($order->product->paymentPageDetail?->deliveryFiles() ?? []) : [],
            'openUrl' => url('/me/login?email=' . urlencode((string) $order->buyer_email)),
        ]);
    }
}
