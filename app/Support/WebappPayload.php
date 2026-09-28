<?php

namespace App\Support;

use App\Models\Store;
use App\Models\User;

/**
 * Webapp ka poora data ek hi jagah se — live page (/w/{username}) aur dashboard ka
 * theme preview dono yahi use karte hain, taaki preview bilkul live jaisa ho.
 * (Wahi soch jo StorefrontCatalog me hai.)
 */
class WebappPayload
{
    public static function for(User $creator, Store $store): array
    {
        $appearance = $store->appearance;

        return [
            'theme' => WebappThemes::resolve($appearance?->webapp_theme, $creator),
            'creator' => [
                'name' => $creator->name,
                'username' => $creator->username,
            ],
            'store' => [
                'display_name' => $store->display_name ?: $creator->name,
                'heading' => $store->header_heading,
                'welcome' => $store->welcome_message,
                'bio' => $store->bio,
                'avatar' => $store->avatar ?: $creator->avatar,
                'sensitive' => (bool) $store->sensitive_content_warning,
                'meta_title' => $store->meta_title,
                'meta_description' => $store->meta_description,
            ],
            'brandColor' => $appearance?->brand_color ?: '#4F46E5',
            'fontFamily' => $appearance?->font_family,
            // storefront wali palette — Studio theme isi se apne dark/light colours banata hai
            'storeTheme' => $appearance?->theme ?: 'classic',
            'socials' => $store->socialLinks->map->only(['platform', 'url'])->values(),
            'headerButtons' => $store->headerButtons->map->only(['label', 'url'])->values(),
            // products + sessions dono isi list me aate hain (type = 'booking' wale session hain)
            'products' => StorefrontCatalog::for($creator),
            'webappUrl' => url("/w/{$creator->username}"),
        ];
    }
}
