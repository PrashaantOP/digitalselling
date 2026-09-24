<?php

namespace Tests\Feature;

use App\Models\LockedContentDetail;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LockedContentPagesTest extends TestCase
{
    use RefreshDatabase;

    private function locked(array $attrs = [], array $detail = []): Product
    {
        /** @var User $creator */
        $creator = User::factory()->createOne(['role' => 'creator', 'username' => 'maker' . User::count()]);

        $product = Product::create($attrs + [
            'creator_id' => $creator->id,
            'type' => 'locked_content',
            'title' => 'Secret stuff',
            'slug' => 'secret-stuff-' . Product::count(),
        ]);

        LockedContentDetail::create($detail + ['product_id' => $product->id, 'category' => 'photos', 'public_teaser' => 'Peek inside']);

        $this->actingAs($creator);

        return $product;
    }

    public function test_dashboard_routes_use_uuid_not_id(): void
    {
        $product = $this->locked();

        $this->get("/dashboard/locked-content/{$product->uuid}/edit")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('LockedContent/Edit'));
        $this->get("/dashboard/locked-content/{$product->id}/edit")->assertNotFound();
    }

    public function test_other_creators_uuid_is_404(): void
    {
        $other = $this->locked();
        $this->locked(); // ab dusra creator logged in hai

        $this->get("/dashboard/locked-content/{$other->uuid}/edit")->assertNotFound();
    }

    public function test_index_renders_with_content_counts(): void
    {
        $this->locked();

        $this->get('/dashboard/locked-content')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('LockedContent/Index')
                ->where('items.data.0.locked_content_detail.images_count', 0));
    }

    public function test_new_item_gets_defaults_and_uuid_redirect(): void
    {
        $this->locked();

        $response = $this->post('/dashboard/locked-content', ['title' => 'Fresh lock']);
        $created = Product::where('title', 'Fresh lock')->firstOrFail();

        $response->assertRedirect("/dashboard/locked-content/{$created->uuid}/edit");
        $this->assertSame('Unlock now', $created->button_text);
        $this->assertSame('other', $created->lockedContentDetail->category);
        $this->assertSame('Unlock this content to view it.', $created->lockedContentDetail->public_teaser);
    }

    public function test_invalid_category_is_rejected(): void
    {
        $product = $this->locked();

        $this->put("/dashboard/locked-content/{$product->uuid}", ['category' => 'weapons'])->assertSessionHasErrors('category');
        $this->put("/dashboard/locked-content/{$product->uuid}", ['category' => 'templates'])->assertSessionHasNoErrors();
        $this->assertSame('templates', $product->fresh()->lockedContentDetail->category);
    }

    public function test_public_page_shows_counts_but_never_hidden_content(): void
    {
        Storage::fake('local');
        $product = $this->locked(['status' => 'published', 'price' => 49], [
            'hidden_message' => 'the-secret-message',
            'hidden_video_url' => 'https://youtu.be/secret-video',
        ]);
        $detail = $product->lockedContentDetail;
        $detail->images()->create(['image_path' => 'creators/1/locked/secret-image.jpg']);
        $detail->files()->create(['file_path' => 'creators/1/locked/secret-file.zip', 'original_name' => 'bonus.zip']);

        $this->get("/l/{$product->slug}")
            ->assertOk()
            ->assertDontSee('the-secret-message')
            ->assertDontSee('secret-video')
            ->assertDontSee('secret-image')
            ->assertDontSee('secret-file')
            ->assertInertia(fn (Assert $page) => $page
                ->component('Public/LockedContent')
                ->where('product.locked.has_message', true)
                ->where('product.locked.has_video', true)
                ->where('product.locked.image_count', 1)
                ->where('product.locked.file_count', 1)
                ->where('product.locked.public_teaser', 'Peek inside'));
    }

    public function test_draft_public_page_is_404(): void
    {
        $product = $this->locked();

        $this->get("/l/{$product->slug}")->assertNotFound();
    }

    public function test_hidden_images_are_private_and_served_to_creator(): void
    {
        Storage::fake('local');
        Storage::fake('assets');
        $product = $this->locked();

        $this->post("/dashboard/locked-content/{$product->uuid}/images", ['images' => [UploadedFile::fake()->image('a.jpg')]])
            ->assertSessionHasNoErrors();

        $image = $product->lockedContentDetail->images()->firstOrFail();
        $this->assertStringStartsWith('creators/', $image->image_path);
        Storage::disk('local')->assertExists($image->image_path);

        $this->get("/dashboard/locked-content-images/{$image->id}")->assertOk();

        $this->delete("/dashboard/locked-content-images/{$image->id}")->assertSessionHasNoErrors();
        Storage::disk('local')->assertMissing($image->image_path);
    }

    public function test_publish_needs_some_hidden_content(): void
    {
        Storage::fake('local');
        $product = $this->locked(['price' => 99]);

        $this->post("/dashboard/locked-content/{$product->uuid}/publish")->assertSessionHasErrors('publish');

        $this->post("/dashboard/locked-content/{$product->uuid}/images", ['images' => [UploadedFile::fake()->image('a.jpg')]]);
        $this->post("/dashboard/locked-content/{$product->uuid}/publish")->assertSessionHasNoErrors();
        $this->assertSame('published', $product->fresh()->status);
    }

    public function test_duplicate_copies_hidden_images_and_files_privately(): void
    {
        Storage::fake('local');
        $product = $this->locked();

        $this->post("/dashboard/locked-content/{$product->uuid}/images", ['images' => [UploadedFile::fake()->image('a.jpg')]]);
        $this->post("/dashboard/locked-content/{$product->uuid}/files", ['files' => [UploadedFile::fake()->create('bonus.zip', 5)]]);

        $this->post("/dashboard/locked-content/{$product->uuid}/duplicate");

        $copy = Product::where('title', 'Secret stuff (Copy)')->firstOrFail()->lockedContentDetail;
        $original = $product->fresh()->lockedContentDetail;

        $this->assertCount(1, $copy->images);
        $this->assertCount(1, $copy->files);
        $this->assertNotSame($original->images[0]->image_path, $copy->images[0]->image_path);
        $this->assertNotSame($original->files[0]->file_path, $copy->files[0]->file_path);
        $this->assertSame('bonus.zip', $copy->files[0]->original_name);
        Storage::disk('local')->assertExists($copy->images[0]->image_path);
        Storage::disk('local')->assertExists($copy->files[0]->file_path);
    }
}
