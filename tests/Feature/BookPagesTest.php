<?php

namespace Tests\Feature;

use App\Models\BookDetail;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BookPagesTest extends TestCase
{
    use RefreshDatabase;

    private function book(array $attrs = [], array $detail = []): Product
    {
        /** @var User $creator */
        $creator = User::factory()->createOne(['role' => 'creator', 'username' => 'writer' . User::count()]);

        $product = Product::create($attrs + [
            'creator_id' => $creator->id,
            'type' => 'book',
            'title' => 'Test book',
            'slug' => 'test-book-' . Product::count(),
        ]);

        BookDetail::create($detail + ['product_id' => $product->id, 'author_name' => 'Jane Doe', 'pages' => 120]);

        $this->actingAs($creator);

        return $product;
    }

    public function test_published_book_renders_public_page(): void
    {
        $product = $this->book(['status' => 'published', 'price' => 99]);

        $this->get("/b/{$product->slug}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Public/Book')
                ->where('product.book.author_name', 'Jane Doe')
                ->where('product.book.pages', 120));
    }

    public function test_draft_book_public_page_is_404(): void
    {
        $product = $this->book();

        $this->get("/b/{$product->slug}")->assertNotFound();
    }

    public function test_dashboard_routes_use_uuid_not_id(): void
    {
        $product = $this->book();

        $this->get("/dashboard/books/{$product->uuid}/edit")->assertOk();
        $this->get("/dashboard/books/{$product->id}/edit")->assertNotFound();
    }

    public function test_other_creators_book_uuid_is_404(): void
    {
        $other = $this->book();
        $this->book(); // ab dusra creator logged in hai

        $this->get("/dashboard/books/{$other->uuid}/edit")->assertNotFound();
    }

    public function test_create_and_duplicate_redirect_to_uuid_edit_url(): void
    {
        $product = $this->book();

        $this->post('/dashboard/books', ['title' => 'Fresh book'])
            ->assertRedirect("/dashboard/books/" . Product::where('title', 'Fresh book')->value('uuid') . '/edit');

        $this->post("/dashboard/books/{$product->uuid}/duplicate")
            ->assertRedirect("/dashboard/books/" . Product::where('title', 'Test book (Copy)')->value('uuid') . '/edit');
    }

    public function test_listing_fields_save_without_blank_rows(): void
    {
        $product = $this->book();

        $this->put("/dashboard/books/{$product->uuid}", [
            'subtitle' => 'A short line',
            'format' => 'epub',
            'whats_inside' => ['12 chapters', '  ', 'Bonus templates'],
            'faqs' => [
                ['question' => 'Is it a PDF?', 'answer' => 'Yes'],
                ['question' => '', 'answer' => 'orphan answer'],
            ],
        ])->assertSessionHasNoErrors();

        $detail = $product->fresh()->bookDetail;

        $this->assertSame('A short line', $detail->subtitle);
        $this->assertSame('epub', $detail->format);
        $this->assertSame(['12 chapters', 'Bonus templates'], $detail->whats_inside);
        $this->assertSame([['question' => 'Is it a PDF?', 'answer' => 'Yes']], $detail->faqs);
    }

    public function test_format_follows_uploaded_file_and_accepts_mobi_zip(): void
    {
        Storage::fake('local');
        $product = $this->book();

        $this->post("/dashboard/books/{$product->uuid}/file", ['file' => \Illuminate\Http\UploadedFile::fake()->create('novel.mobi', 10)])
            ->assertSessionHasNoErrors();
        $this->assertSame('mobi', $product->fresh()->bookDetail->format);

        $this->put("/dashboard/books/{$product->uuid}", ['format' => 'zip'])->assertSessionHasNoErrors();
        $this->assertSame('zip', $product->fresh()->bookDetail->format);

        $this->put("/dashboard/books/{$product->uuid}", ['format' => 'other'])->assertSessionHasErrors('format');
    }

    public function test_customer_decides_pricing_is_accepted(): void
    {
        $product = $this->book();

        $this->put("/dashboard/books/{$product->uuid}", ['pricing_type' => 'customer_decides', 'price' => 49])
            ->assertSessionHasNoErrors();

        $this->assertSame('customer_decides', $product->fresh()->pricing_type);
    }

    public function test_new_book_defaults_to_buy_and_download_button(): void
    {
        $this->book();

        $this->post('/dashboard/books', ['title' => 'Fresh book']);

        $this->assertSame('Buy & Download', Product::where('title', 'Fresh book')->value('button_text'));
    }

    public function test_public_page_exposes_listing_fields_but_not_the_file(): void
    {
        $product = $this->book(['status' => 'published', 'price' => 99], [
            'subtitle' => 'Line',
            'whats_inside' => ['Point'],
            'faqs' => [['question' => 'Q', 'answer' => 'A']],
            'file_path' => 'creators/1/books/secret.pdf',
        ]);

        $this->get("/b/{$product->slug}")
            ->assertOk()
            ->assertDontSee('secret.pdf')
            ->assertInertia(fn (Assert $page) => $page
                ->where('product.book.subtitle', 'Line')
                ->where('product.book.whats_inside', ['Point'])
                ->where('product.book.faqs.0.question', 'Q'));
    }

    public function test_duplicate_gets_its_own_copy_of_the_file(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('creators/1/books/original.pdf', 'pdf-bytes');

        $product = $this->book([], ['file_path' => 'creators/1/books/original.pdf', 'format' => 'pdf']);

        $this->post("/dashboard/books/{$product->uuid}/duplicate");

        $copy = Product::where('title', 'Test book (Copy)')->firstOrFail();
        $copyPath = $copy->bookDetail->file_path;

        $this->assertNotNull($copyPath);
        $this->assertNotSame('creators/1/books/original.pdf', $copyPath);
        Storage::disk('local')->assertExists($copyPath);

        // copy se file hatao — original ki file bachi rehni chahiye
        $this->post("/dashboard/books/{$copy->uuid}/file", ['remove_file' => true])->assertSessionHasNoErrors();

        Storage::disk('local')->assertMissing($copyPath);
        Storage::disk('local')->assertExists('creators/1/books/original.pdf');
    }
}
