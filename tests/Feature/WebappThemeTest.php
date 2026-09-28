<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Store;
use App\Models\StoreAppearance;
use App\Models\User;
use App\Support\WebappThemes;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class WebappThemeTest extends TestCase
{
    use RefreshDatabase;

    private User $creator;

    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();

        $this->creator = User::factory()->createOne(['role' => 'creator', 'username' => 'riya', 'plan' => 'free', 'plan_expires_at' => null]);
        $this->store = Store::create(['user_id' => $this->creator->id, 'username' => 'riya', 'display_name' => 'Riya Studio', 'is_live' => true]);
    }

    private function goPro(): void
    {
        $this->creator->forceFill(['plan' => 'pro', 'plan_expires_at' => now()->addDays(30)])->save();
        $this->creator->refresh();
    }

    private function theme(): ?string
    {
        return StoreAppearance::where('store_id', $this->store->id)->value('webapp_theme');
    }

    public function test_gallery_locks_premium_themes_on_the_free_plan(): void
    {
        $this->actingAs($this->creator)->get('/dashboard/web-app')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Webapp/Index')
            ->where('isPro', false)
            ->where('themes.0.slug', WebappThemes::FREE)
            ->where('themes.0.locked', false)
            ->where('themes.1.locked', true)
        );
    }

    public function test_free_creator_cannot_apply_a_premium_theme(): void
    {
        $this->actingAs($this->creator)
            ->put('/dashboard/web-app', ['theme' => 'grid'])
            ->assertSessionHasErrors('theme');

        $this->assertNotSame('grid', $this->theme());
    }

    public function test_pro_creator_can_apply_a_premium_theme(): void
    {
        $this->goPro();

        $this->actingAs($this->creator)
            ->put('/dashboard/web-app', ['theme' => 'pocket'])
            ->assertSessionHasNoErrors();

        $this->assertSame('pocket', $this->theme());
    }

    public function test_unknown_theme_is_rejected(): void
    {
        $this->goPro();

        $this->actingAs($this->creator)
            ->put('/dashboard/web-app', ['theme' => 'hacker'])
            ->assertSessionHasErrors('theme');
    }

    /** Pro khatam → webapp apne aap free theme pe, par DB me chuni hui theme bachi rahe. */
    public function test_premium_theme_falls_back_to_free_when_pro_lapses(): void
    {
        $this->goPro();
        $this->actingAs($this->creator)->put('/dashboard/web-app', ['theme' => 'press']);

        $this->creator->forceFill(['plan' => 'pro', 'plan_expires_at' => now()->subDay()])->save();

        $this->get('/w/riya')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Public/Webapp')
            ->where('theme', WebappThemes::FREE)
        );

        // DB me choice bachi hai — Pro wapas lete hi theme laut aati hai
        $this->assertSame('press', $this->theme());

        $this->goPro();
        $this->get('/w/riya')->assertOk()->assertInertia(fn (Assert $page) => $page->where('theme', 'press'));
    }

    public function test_webapp_page_carries_products_and_sessions(): void
    {
        Product::create([
            'creator_id' => $this->creator->id, 'type' => 'book', 'title' => 'Notion Kit',
            'slug' => 'notion-kit', 'status' => 'published', 'published_at' => now(),
        ]);

        $this->get('/w/riya')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Public/Webapp')
            ->where('theme', WebappThemes::FREE)
            ->where('store.display_name', 'Riya Studio')
            ->has('products', 1)
            ->where('products.0.title', 'Notion Kit')
            ->has('webappUrl')
        );
    }

    public function test_manifest_is_per_creator_and_scoped_to_the_webapp(): void
    {
        $response = $this->get('/w/riya/manifest.webmanifest')->assertOk();

        $this->assertStringContainsString('application/manifest+json', $response->headers->get('Content-Type'));
        $response->assertJson([
            'name' => 'Riya Studio',
            'start_url' => '/w/riya',
            'scope' => '/w/riya',
            'display' => 'standalone',
        ]);
    }

    public function test_offline_store_hides_the_webapp_from_the_public(): void
    {
        $this->store->forceFill(['is_live' => false])->save();

        $this->get('/w/riya')->assertNotFound();
        $this->get('/w/riya/manifest.webmanifest')->assertNotFound();
    }

    public function test_sub_admin_without_store_edit_cannot_change_the_theme(): void
    {
        $member = User::factory()->createOne([
            'role' => 'sub_admin',
            'parent_creator_id' => $this->creator->id,
            'username' => 'helper',
        ]);

        $this->actingAs($member)->put('/dashboard/web-app', ['theme' => WebappThemes::FREE])->assertForbidden();
    }
}
