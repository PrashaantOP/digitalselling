<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Dark mode sirf creator dashboard pe. Public store / customer portal hamesha light,
 * aur cookie na ho to default light.
 */
class AppearanceScopeTest extends TestCase
{
    use RefreshDatabase;

    private function creator(): User
    {
        $user = User::factory()->createOne(['role' => 'creator', 'username' => 'riya']);
        Store::create(['user_id' => $user->id, 'username' => 'riya', 'display_name' => 'Riya Studio', 'is_live' => true]);

        return $user;
    }

    private function htmlTag(string $html): string
    {
        preg_match('/<html[^>]*>/', $html, $m);

        return $m[0] ?? '';
    }

    public function test_dashboard_is_dark_when_creator_picks_dark()
    {
        $user = $this->creator();

        foreach (['/dashboard', '/settings/appearance', '/dashboard/products'] as $url) {
            $html = $this->actingAs($user)->withUnencryptedCookie('appearance', 'dark')->get($url)->assertOk()->getContent();

            $this->assertStringContainsString('class="dark"', $this->htmlTag($html), $url);
        }
    }

    public function test_public_pages_stay_light_even_with_dark_cookie()
    {
        $this->creator();

        foreach (['/riya', '/me/login', '/'] as $url) {
            $html = $this->withUnencryptedCookie('appearance', 'dark')->get($url)->assertOk()->getContent();

            $this->assertStringNotContainsString('dark', $this->htmlTag($html), $url);
        }
    }

    public function test_default_is_light_without_cookie()
    {
        $user = $this->creator();

        $html = $this->actingAs($user)->get('/dashboard')->assertOk()->getContent();

        $this->assertStringNotContainsString('dark', $this->htmlTag($html));
        $this->assertStringContainsString("const appearance = 'light'", $html);
    }

    public function test_unknown_cookie_value_falls_back_to_light()
    {
        $user = $this->creator();

        $html = $this->actingAs($user)->withUnencryptedCookie('appearance', "dark';alert(1);'")->get('/dashboard')->assertOk()->getContent();

        $this->assertStringContainsString("const appearance = 'light'", $html);
    }
}
