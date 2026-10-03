<?php

namespace Tests\Feature;

use App\Mail\OrderReceiptMail;
use App\Models\Order;
use App\Models\PaymentPageDetail;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Feature\Concerns\SellsProducts;
use Tests\TestCase;

/** Payment page ke "Files to deliver": pay ke baad buyer ko email, checkout done page aur My purchases me. */
class PaymentPageFilesTest extends TestCase
{
    use RefreshDatabase, SellsProducts;

    private User $creator;

    private Product $page;

    private const DRIVE = 'https://drive.google.com/file/d/abc123/view';

    private const DROPBOX = 'https://www.dropbox.com/s/xyz/templates.zip';

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeGateways();

        $this->creator = $this->seller();
        $this->page = $this->product($this->creator, 'payment_page', ['title' => 'Notion templates', 'slug' => 'notion-templates', 'price' => 299]);
        PaymentPageDetail::create(['product_id' => $this->page->id, 'collect_full_name' => true, 'delivery_files' => [
            ['label' => 'Workbook (PDF)', 'url' => self::DRIVE],
            ['label' => null, 'url' => self::DROPBOX],
        ]]);
    }

    public function test_creator_saves_file_links_and_half_typed_rows_are_dropped(): void
    {
        $this->actingAs($this->creator)->putJson("/dashboard/payment-pages/{$this->page->uuid}", [
            'title' => 'Notion templates',
            'delivery_files' => [
                ['label' => '  Planner  ', 'url' => self::DRIVE],
                ['label' => 'Still typing', 'url' => ''],
                ['label' => '', 'url' => self::DROPBOX],
            ],
        ])->assertOk();

        $this->assertSame([
            ['label' => 'Planner', 'url' => self::DRIVE],
            ['label' => null, 'url' => self::DROPBOX],
        ], $this->page->paymentPageDetail()->first()->delivery_files);

        $this->actingAs($this->creator)->putJson("/dashboard/payment-pages/{$this->page->uuid}", ['title' => 'Notion templates', 'delivery_files' => []])->assertOk();
        $this->assertNull($this->page->paymentPageDetail()->first()->delivery_files);
    }

    public function test_only_real_web_links_are_accepted(): void
    {
        foreach (['drive.google.com/abc', 'javascript:alert(1)', 'ftp://files.example/a.zip'] as $bad) {
            $this->actingAs($this->creator)->putJson("/dashboard/payment-pages/{$this->page->uuid}", ['title' => 'X', 'delivery_files' => [['label' => 'A', 'url' => $bad]]])
                ->assertUnprocessable()->assertJsonValidationErrors('delivery_files.0.url');
        }
    }

    public function test_the_public_page_shows_only_how_many_files_never_the_links(): void
    {
        $response = $this->get('/p/notion-templates')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('product.payment_page.files_count', 2)
            ->missing('product.payment_page.delivery_files')
        );

        $this->assertStringNotContainsString('abc123', $response->getContent());
        $this->assertStringNotContainsString('dropbox', $response->getContent());
    }

    public function test_after_payment_the_buyer_gets_the_links_by_email_on_the_done_page_and_in_purchases(): void
    {
        $order = $this->buy($this->page);

        Mail::assertSent(OrderReceiptMail::class, function (OrderReceiptMail $mail) {
            $html = $mail->render();

            return str_contains($html, self::DRIVE) && str_contains($html, 'Workbook (PDF)')
                && str_contains($html, self::DROPBOX) && str_contains($html, 'File 2'); // naam na ho to "File 2"
        });

        // checkout done page (isi browser ka order)
        $this->get("/checkout/done/{$order->uuid}")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('order.files.0.url', self::DRIVE)
            ->where('order.files.1.label', 'File 2')
        );

        $this->asBuyer()->get('/me/purchases')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('orders.0.items.0.files.0.label', 'Workbook (PDF)')
            ->where('orders.0.items.0.files.1.url', self::DROPBOX)
        );
    }

    public function test_an_unpaid_order_shows_no_files(): void
    {
        $this->checkout($this->page)->assertCreated(); // pending — pay nahi kiya
        $order = Order::firstOrFail();

        $this->get("/checkout/done/{$order->uuid}")->assertOk()->assertInertia(fn (Assert $page) => $page->where('order.files', []));
        Mail::assertNotSent(OrderReceiptMail::class);
    }

    public function test_other_product_types_carry_no_files(): void
    {
        $book = $this->product($this->creator, 'book', ['slug' => 'guide']);
        $this->buy($book);

        $this->asBuyer()->get('/me/purchases')->assertInertia(fn (Assert $page) => $page->where('orders.0.items.0.files', []));
    }
}
