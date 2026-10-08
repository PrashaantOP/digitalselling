<?php

namespace App\Support;

use App\Models\User;

/**
 * Creator ke webapp (/w/{username}) ke designs. Ek free, baaki Plus ke saath unlock.
 *
 * Server hi source of truth hai — frontend ka registry sirf cards ki copy ke liye hai.
 * Sabse zaroori hissa resolve(): Plus khatam ho jaye to webapp apne aap free theme pe
 * gir jaata hai, par DB me chuna hua theme bacha rehta hai — Plus lautte hi wapas mil jaata hai.
 */
class WebappThemes
{
    /** Purana webapp design — free plan pe yahi rehta hai, taaki kisi creator ka page badle na. */
    public const FREE = 'studio';

    public const ALL = [
        'studio' => ['name' => 'Studio', 'tagline' => 'Full website — hero, sections aur footer', 'plus' => false],
        'bold' => ['name' => 'Bold', 'tagline' => 'Neo-brutalist website — thick borders, hard shadows', 'plus' => true],
        'azure' => ['name' => 'Azure', 'tagline' => 'Clean corporate website with a diagonal hero', 'plus' => true],
        'notebook' => ['name' => 'Notebook', 'tagline' => 'Classroom feel — graph paper, filters, clickable steps', 'plus' => true],
    ];

    /** @return string[] */
    public static function slugs(): array
    {
        return array_keys(self::ALL);
    }

    public static function isPlus(string $slug): bool
    {
        return (bool) (self::ALL[$slug]['plus'] ?? false);
    }

    /** @return string[] jo theme ye creator abhi laga sakta hai */
    public static function allowedFor(User $creator): array
    {
        return PlanPricing::effectivePlan($creator) === 'plus' ? self::slugs() : [self::FREE];
    }

    /** Render ke waqt ka asli theme — unknown ya locked ho to free. */
    public static function resolve(?string $slug, User $creator): string
    {
        return $slug && in_array($slug, self::allowedFor($creator), true) ? $slug : self::FREE;
    }

    /**
     * Gallery ke liye list — kaunsa locked hai ye bhi saath me.
     *
     * @return array<int, array{slug: string, name: string, tagline: string, plus: bool, locked: bool}>
     */
    public static function forCreator(User $creator): array
    {
        $allowed = self::allowedFor($creator);

        return collect(self::ALL)
            ->map(fn (array $meta, string $slug) => [
                'slug' => $slug,
                'name' => $meta['name'],
                'tagline' => $meta['tagline'],
                'plus' => $meta['plus'],
                'locked' => ! in_array($slug, $allowed, true),
            ])
            ->values()
            ->all();
    }
}
