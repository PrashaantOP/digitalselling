<?php

namespace Tests\Feature;

use App\Http\Controllers\Public\HomeController;
use App\Http\Controllers\Settings\CreatorProfileController;
use App\Models\Product;
use App\Models\Store;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HomePageTest extends TestCase
{
    use RefreshDatabase;

    public function test_home_renders_landing_with_live_stats()
    {
        Cache::forget('home.stats');
        $creator = User::factory()->createOne(['role' => 'creator', 'username' => 'riya']);
        Product::create(['creator_id' => $creator->id, 'type' => 'course', 'title' => 'Excel', 'slug' => 'excel', 'status' => 'published', 'published_at' => now()]);
        Product::create(['creator_id' => $creator->id, 'type' => 'book', 'title' => 'Draft', 'slug' => 'draft', 'status' => 'draft']);

        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Home')
            ->where('stats.creators', 1)
            ->where('stats.products', 1)
            ->where('stats.courses', 1)
            ->has('stats.lessons')
            ->has('stats.learners')
            ->where('trialDays', 90));
    }

    public function test_home_pricing_shows_free_and_pro_only()
    {
        // band plan landing pe nahi aana chahiye
        SubscriptionPlan::create(['name' => 'Legacy', 'slug' => 'legacy', 'monthly_price' => 299, 'commission_rate' => 5, 'is_active' => false]);

        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('plans', fn ($plans) => collect($plans)->map(fn ($p) => [$p['slug'], (float) $p['commission_rate'], (float) $p['monthly_price']])->all()
                === [['free', 15.0, 0.0], ['pro', 10.0, 499.0]]));
    }

    public function test_home_works_without_any_products()
    {
        Cache::forget('home.stats');

        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Home')
            ->where('stats.products', 0));
    }

    public function test_every_product_page_renders_with_pricing()
    {
        foreach (HomeController::PRODUCT_PAGES as $slug => $type) {
            $this->get("/products/{$slug}")->assertOk()->assertInertia(fn (Assert $page) => $page
                ->component('Platform/Product')
                ->where('type', $type)
                ->has('plans', 2)
                ->where('trialDays', 90));
        }
    }

    public function test_unknown_product_page_is_404()
    {
        $this->get('/products/podcasts')->assertNotFound();
    }

    public function test_every_footer_page_renders_instead_of_a_storefront()
    {
        foreach (HomeController::PAGES as $slug) {
            $this->get("/{$slug}")->assertOk()->assertInertia(fn (Assert $page) => $page
                ->component('Legal/Policy')
                ->where('page', $slug));
        }
    }

    public function test_landing_slugs_are_reserved_usernames()
    {
        foreach ([...HomeController::PAGES, 'products'] as $slug) {
            $this->assertContains($slug, CreatorProfileController::RESERVED_USERNAMES);
        }
    }

    public function test_creator_storefront_catch_all_still_works()
    {
        $creator = User::factory()->createOne(['role' => 'creator', 'username' => 'riya']);
        Store::create(['user_id' => $creator->id, 'username' => 'riya', 'display_name' => 'Riya Studio', 'is_live' => true]);

        $this->get('/riya')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Public/Store'));
    }
}
