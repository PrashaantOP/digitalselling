<?php

namespace App\Support;

use App\Models\User;

/**
 * Creator ke webapp (/w/{username}) ke designs. Ek free, baaki Pro ke saath unlock.
 *
 * Server hi source of truth hai — frontend ka registry sirf cards ki copy ke liye hai.
 * Sabse zaroori hissa resolve(): Pro khatam ho jaye to webapp apne aap free theme pe
 * gir jaata hai, par DB me chuna hua theme bacha rehta hai — Pro lautte hi wapas mil jaata hai.
 */
class WebappThemes
{
    /** Purana webapp design — free plan pe yahi rehta hai, taaki kisi creator ka page badle na. */
    public const FREE = 'studio';

    public const ALL = [
        'studio' => ['name' => 'Studio', 'tagline' => 'Full website — hero, sections aur footer', 'pro' => false],
        'aurora' => ['name' => 'Aurora', 'tagline' => 'Soft gradient hero with stacked cards', 'pro' => true],
        'grid' => ['name' => 'Grid', 'tagline' => 'Sticky header with a two-column catalogue', 'pro' => true],
        'press' => ['name' => 'Press', 'tagline' => 'Editorial look — big type, quiet layout', 'pro' => true],
        'pocket' => ['name' => 'Pocket', 'tagline' => 'App-style with a bottom tab bar', 'pro' => true],
    ];

    /** @return string[] */
    public static function slugs(): array
    {
        return array_keys(self::ALL);
    }

    public static function isPro(string $slug): bool
    {
        return (bool) (self::ALL[$slug]['pro'] ?? false);
    }

    /** @return string[] jo theme ye creator abhi laga sakta hai */
    public static function allowedFor(User $creator): array
    {
        return PlanPricing::effectivePlan($creator) === 'pro' ? self::slugs() : [self::FREE];
    }

    /** Render ke waqt ka asli theme — unknown ya locked ho to free. */
    public static function resolve(?string $slug, User $creator): string
    {
        return $slug && in_array($slug, self::allowedFor($creator), true) ? $slug : self::FREE;
    }

    /**
     * Gallery ke liye list — kaunsa locked hai ye bhi saath me.
     *
     * @return array<int, array{slug: string, name: string, tagline: string, pro: bool, locked: bool}>
     */
    public static function forCreator(User $creator): array
    {
        $allowed = self::allowedFor($creator);

        return collect(self::ALL)
            ->map(fn (array $meta, string $slug) => [
                'slug' => $slug,
                'name' => $meta['name'],
                'tagline' => $meta['tagline'],
                'pro' => $meta['pro'],
                'locked' => ! in_array($slug, $allowed, true),
            ])
            ->values()
            ->all();
    }
}
