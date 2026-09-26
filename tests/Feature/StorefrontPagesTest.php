<?php

namespace Tests\Feature;

use App\Models\BookingServiceDetail;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StorefrontPagesTest extends TestCase
{
    use RefreshDatabase;

    private User $creator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->creator = User::factory()->createOne(['role' => 'creator', 'username' => 'riya']);
        Store::create(['user_id' => $this->creator->id, 'username' => 'riya', 'display_name' => 'Riya Studio', 'is_live' => true]);
    }

    private function product(array $attrs = []): Product
    {
        return Product::create($attrs + [
            'creator_id' => $this->creator->id,
            'type' => 'book',
            'title' => 'Guide ' . Product::count(),
            'slug' => 'guide-' . Product::count(),
            'status' => 'published',
            'published_at' => now(),
        ]);
    }

    private function bookingSession(bool $active, string $title): Product
    {
        $product = $this->product(['type' => 'booking', 'title' => $title, 'slug' => str($title)->slug()->toString()]);
        BookingServiceDetail::create(['product_id' => $product->id, 'duration_minutes' => 30, 'is_active' => $active]);

        return $product;
    }

    public function test_store_page_lists_published_products_and_active_sessions_only()
    {
        $this->product(['title' => 'Notion Kit']);
        $this->product(['title' => 'Draft Thing', 'status' => 'draft']);
        $this->bookingSession(true, 'Career Call');
        $this->bookingSession(false, 'Old Call');

        $this->get('/riya')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Public/Store')
            ->where('creator.username', 'riya')
            ->has('products', 2)
            ->where('products', fn ($products) => collect($products)->pluck('title')->sort()->values()->all() === ['Career Call', 'Notion Kit'])
            ->where('products', fn ($products) => collect($products)->firstWhere('type', 'booking')['duration_minutes'] === 30
                && str_ends_with(collect($products)->firstWhere('type', 'booking')['url'], '/book/riya?service=career-call'))
        );
    }

    public function test_webapp_is_served_under_w_prefix_with_same_products()
    {
        $this->product(['title' => 'Notion Kit']);

        $this->get('/w/riya')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Public/Storefront')
            ->has('products', 1)
            ->where('products.0.title', 'Notion Kit')
        );
    }

    public function test_both_pages_404_when_store_is_not_live()
    {
        Store::where('user_id', $this->creator->id)->update(['is_live' => false]);

        $this->get('/riya')->assertNotFound();
        $this->get('/w/riya')->assertNotFound();
    }

    public function test_owner_can_preview_own_offline_store()
    {
        Store::where('user_id', $this->creator->id)->update(['is_live' => false]);

        $this->actingAs($this->creator);

        $this->get('/riya')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Public/Store')->where('ownerPreview', true));
        $this->get('/w/riya')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Public/Storefront')->where('ownerPreview', true));
    }

    public function test_unknown_or_non_creator_usernames_404()
    {
        $this->get('/nobody')->assertNotFound();
        $this->get('/w/nobody')->assertNotFound();
        $this->get('/w/dashboard')->assertNotFound();
    }

    public function test_store_editor_receives_real_products_for_live_preview()
    {
        $this->product(['title' => 'Notion Kit']);
        $this->product(['title' => 'Draft Thing', 'status' => 'draft']);

        $this->actingAs($this->creator);

        foreach (['/dashboard/store', '/dashboard/store/appearance', '/dashboard/store/settings', '/dashboard/store/analytics'] as $url) {
            $this->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
                ->component('Store/Edit')
                ->has('products', 1)
                ->where('products.0.title', 'Notion Kit')
            );
        }
    }

    public function test_w_cannot_be_taken_as_a_store_username()
    {
        $this->actingAs($this->creator)
            ->put('/dashboard/store/settings', ['username' => 'w', 'column_layout' => 'single'])
            ->assertSessionHasErrors('username');
    }
}
