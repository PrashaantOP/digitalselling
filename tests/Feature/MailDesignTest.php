<?php

namespace Tests\Feature;

use App\Mail\OrderReceiptMail;
use App\Models\Order;
use App\Models\Store;
use App\Support\MailPreviews;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Markdown;
use Tests\Feature\Concerns\SellsProducts;
use Tests\TestCase;

/**
 * Emails ka design: har email naye theme (dashboard ke rang) me bina error render ho, inbox preview line ho,
 * buyer mails me creator ka store + "Powered by", creator mails me notification settings ka link.
 */
class MailDesignTest extends TestCase
{
    use RefreshDatabase, SellsProducts;

    private const BUYER = ['order-receipt', 'order-receipt-files', 'booking-confirmed', 'order-refunded-buyer'];

    private const CREATOR = ['new-sale', 'new-booking', 'course-completed', 'order-refunded-creator', 'settlement-paid', 'settlement-failed', 'weekly-digest'];

    private const SECURITY = ['login-otp', 'new-device-login', 'security-notice', 'reset-password'];

    public function test_every_email_renders_in_the_brand_theme_with_a_preview_line(): void
    {
        foreach (MailPreviews::all() as $key => $preview) {
            $html = (string) ($preview['make'])()->render();

            $this->assertStringContainsString('#4f46e5', $html, "{$key}: brand colour missing");
            $this->assertStringContainsString('class="preheader"', $html, "{$key}: inbox preview line missing");
            $this->assertStringContainsString('class="badge badge-', $html, "{$key}: badge missing");
            $this->assertStringNotContainsString('laravel.com', $html, "{$key}: Laravel default header leaked");
            $this->assertStringNotContainsString('<x-mail', $html, "{$key}: a component did not compile");
            // markdown ne component HTML ko code block bana diya ho to ye dikhta hai
            $this->assertStringNotContainsString('&lt;table', $html, "{$key}: component HTML was escaped");
        }
    }

    public function test_buyer_emails_carry_the_creators_store_and_powered_by(): void
    {
        $all = MailPreviews::all();

        foreach (self::BUYER as $key) {
            $html = (string) ($all[$key]['make'])()->render();

            $this->assertStringContainsString('Ria Designs', $html, "{$key}: store name missing from the header");
            $this->assertStringContainsString('Powered by', $html, $key);
            $this->assertStringNotContainsString('Manage email notifications', $html, $key);
        }
    }

    public function test_creator_and_security_emails_have_the_right_footer(): void
    {
        $all = MailPreviews::all();

        foreach (self::CREATOR as $key) {
            $this->assertStringContainsString('Manage email notifications', (string) ($all[$key]['make'])()->render(), $key);
        }

        foreach (self::SECURITY as $key) {
            $html = (string) ($all[$key]['make'])()->render();
            $this->assertStringContainsString('account security email', $html, $key);
            $this->assertStringNotContainsString('Powered by', $html, $key);
        }
    }

    public function test_every_email_has_a_plain_text_version(): void
    {
        foreach (MailPreviews::all() as $key => $preview) {
            $mailable = ($preview['make'])();

            if (! $mailable instanceof Mailable) {
                continue; // verify / reset — Laravel MailMessage, text Laravel khud banata hai
            }

            $content = $mailable->content();
            $text = (string) app(Markdown::class)->renderText($content->markdown, array_merge($mailable->buildViewData(), $content->with));

            $this->assertNotSame('', trim($text), $key);
            $this->assertStringNotContainsString('<table', $text, "{$key}: HTML in the text version");
        }
    }

    public function test_the_otp_is_shown_large_and_the_receipt_lists_the_order(): void
    {
        $all = MailPreviews::all();

        $this->assertMatchesRegularExpression('/class="code"[^>]*>482193</', (string) ($all['login-otp']['make'])()->render());

        $receipt = (string) ($all['order-receipt']['make'])()->render();
        $this->assertStringContainsString('ORD-2026-00042', $receipt);
        $this->assertStringContainsString('Icon pack bonus', $receipt);
        $this->assertStringContainsString('₹1,499.00', $receipt);
    }

    public function test_a_real_receipt_uses_the_creators_store_branding(): void
    {
        $this->fakeGateways();
        $creator = $this->seller();
        Store::create(['user_id' => $creator->id, 'username' => $creator->username, 'display_name' => 'Maker Studio', 'avatar' => 'stores/maker.png']);
        $order = $this->buy($this->product($creator, 'course', ['title' => 'Clay basics']));

        $html = (string) (new OrderReceiptMail(Order::findOrFail($order->id)))->render();

        $this->assertStringContainsString('Maker Studio', $html);
        $this->assertStringContainsString(url('/assets/stores/maker.png'), $html);
        $this->assertStringContainsString('Clay basics', $html);
    }

    public function test_the_preview_page_does_not_exist_outside_local(): void
    {
        $this->get('/dev/mails')->assertNotFound();
    }
}
