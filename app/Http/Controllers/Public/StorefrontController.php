<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\User;
use App\Support\StorefrontCatalog;
use Inertia\Inertia;

/**
 * GET /{username}   — creator ka store (link-in-bio, dashboard ke live preview jaisa)
 * GET /w/{username} — creator ki webapp (full marketing website)
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
        return $this->render('Public/Storefront', $username);
    }

    private function render(string $component, string $username)
    {
        $creator = User::where('username', $username)->where('role', 'creator')->where('status', 'active')->firstOrFail();

        $store = Store::with(['appearance', 'socialLinks' => fn ($q) => $q->orderBy('sort_order'), 'headerButtons' => fn ($q) => $q->orderBy('sort_order')])
            ->where('user_id', $creator->id)->firstOrFail();

        // store live nahi to public ke liye 404; owner khud (login hoke) apna offline store dekh sakta hai
        $isOwner = auth()->id() === $creator->id;
        abort_unless($store->is_live || $isOwner, 404);

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
}
