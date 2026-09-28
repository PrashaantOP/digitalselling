<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\User;
use App\Support\StorefrontCatalog;
use App\Support\WebappPayload;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;

/**
 * GET /{username}   — creator ka store (link-in-bio, dashboard ke live preview jaisa)
 * GET /w/{username} — creator ki webapp (theme creator chunta hai; installable PWA)
 */
class StorefrontController extends Controller
{
    public const PREFIX = ['course' => 'c', 'event' => 'e', 'book' => 'b', 'locked_content' => 'l', 'payment_page' => 'p'];

    public function show(string $username)
    {
        return $this->render('Public/Store', $username);
    }

    public function webapp(string $username)
    {
        [$creator, $store] = $this->resolve($username);

        return Inertia::render('Public/Webapp', [
            'ownerPreview' => ! $store->is_live,
            ...WebappPayload::for($creator, $store),
        ]);
    }

    /**
     * PWA manifest — har creator ka apna (naam, colour, icon, scope).
     * PHP route hai isliye shared hosting pe koi MIME/config change nahi chahiye.
     */
    public function manifest(string $username): JsonResponse
    {
        [$creator, $store] = $this->resolve($username);

        $name = $store->display_name ?: $creator->name;
        $icon = ($store->avatar ?: $creator->avatar) ? url('/assets/' . ($store->avatar ?: $creator->avatar)) : null;
        $scope = "/w/{$creator->username}";

        return response()->json([
            'name' => $name,
            'short_name' => \Illuminate\Support\Str::limit($name, 12, ''),
            'description' => $store->meta_description ?: $store->bio,
            'start_url' => $scope,
            'scope' => $scope,
            'display' => 'standalone',
            'orientation' => 'portrait',
            'background_color' => '#FFFFFF',
            'theme_color' => $store->appearance?->brand_color ?: '#4F46E5',
            'icons' => array_values(array_filter([
                // creator ka avatar (agar hai) — size browser khud nikaal lega
                $icon ? ['src' => $icon, 'sizes' => 'any', 'type' => 'image/png', 'purpose' => 'any'] : null,
                ['src' => '/pwa/icon-192.png', 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any maskable'],
                ['src' => '/pwa/icon-512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any maskable'],
            ])),
        ])->header('Content-Type', 'application/manifest+json');
    }

    private function render(string $component, string $username)
    {
        [$creator, $store] = $this->resolve($username);

        return Inertia::render($component, [
            'ownerPreview' => ! $store->is_live,
            'creator' => $creator->only(['name', 'username', 'avatar']),
            'store' => $store->only(['display_name', 'bio', 'avatar', 'welcome_message', 'header_heading', 'column_layout',
                'sensitive_content_warning', 'meta_title', 'meta_description', 'fb_pixel_id', 'ga_tracking_id']),
            'appearance' => $store->appearance,
            'socialLinks' => $store->socialLinks,
            'headerButtons' => $store->headerButtons,
            'products' => StorefrontCatalog::for($creator),
        ]);
    }

    /** @return array{0: User, 1: Store} */
    private function resolve(string $username): array
    {
        $creator = User::where('username', $username)->where('role', 'creator')->where('status', 'active')->firstOrFail();

        $store = Store::with(['appearance', 'socialLinks' => fn ($q) => $q->orderBy('sort_order'), 'headerButtons' => fn ($q) => $q->orderBy('sort_order')])
            ->where('user_id', $creator->id)->firstOrFail();

        // store live nahi to public ke liye 404; owner khud (login hoke) apna offline store dekh sakta hai
        abort_unless($store->is_live || auth()->id() === $creator->id, 404);

        return [$creator, $store];
    }
}
