<?php

namespace App\Support;

/**
 * Team (sub-admin) permissions ka ek hi source of truth. Naam wahi hain jo routes me
 * `perm:{module}.{ability}` / `perm.product:{ability}` middleware use karte hain.
 *
 * Owner-only cheezein (payout method, KYC, payout profile, billing, team, roles, refer & earn)
 * jaan-bujh ke yahan NAHI hain — kisi role me di hi nahi ja saktin.
 */
class TeamPermissions
{
    /** module => [label, allowed abilities] */
    public const MODULES = [
        'store' => ['Store', ['view', 'edit']],
        'courses' => ['Courses', ['view', 'edit', 'delete']],
        'events' => ['Events', ['view', 'edit', 'delete']],
        'books' => ['Books', ['view', 'edit', 'delete']],
        'locked-content' => ['Locked content', ['view', 'edit', 'delete']],
        'payment-pages' => ['Payment pages', ['view', 'edit', 'delete']],
        'bookings' => ['Bookings', ['view', 'edit', 'delete']],
        'autodm' => ['AutoDM', ['view', 'edit', 'delete']],
        'payments' => ['Payments (transactions)', ['view']],
        'payouts' => ['Settlements', ['view']],
        'audience' => ['Audience', ['view']],
    ];

    /** products.type => permission module */
    public const PRODUCT_TYPES = [
        'course' => 'courses',
        'event' => 'events',
        'book' => 'books',
        'locked_content' => 'locked-content',
        'payment_page' => 'payment-pages',
        'booking' => 'bookings',
    ];

    /** Ready-made roles — delete kabhi template me nahi (galti se data jaane ka risk). */
    public const TEMPLATES = [
        'Manager' => [
            'description' => 'Runs the store day to day — products, bookings, AutoDM. Can see sales, but not change payouts.',
            'permissions' => [
                'store.view', 'store.edit',
                'courses.view', 'courses.edit', 'events.view', 'events.edit', 'books.view', 'books.edit',
                'locked-content.view', 'locked-content.edit', 'payment-pages.view', 'payment-pages.edit',
                'bookings.view', 'bookings.edit', 'autodm.view', 'autodm.edit',
                'payments.view', 'payouts.view', 'audience.view',
            ],
        ],
        'Content editor' => [
            'description' => 'Creates and edits products. No access to money or customers.',
            'permissions' => [
                'store.view',
                'courses.view', 'courses.edit', 'events.view', 'events.edit', 'books.view', 'books.edit',
                'locked-content.view', 'locked-content.edit', 'payment-pages.view', 'payment-pages.edit',
            ],
        ],
        'Support' => [
            'description' => 'Helps customers — bookings, audience and transactions, read-only products.',
            'permissions' => ['bookings.view', 'bookings.edit', 'audience.view', 'payments.view', 'courses.view', 'events.view'],
        ],
        'Accountant' => [
            'description' => 'Sees transactions, settlements and customers. Cannot change anything.',
            'permissions' => ['payments.view', 'payouts.view', 'audience.view'],
        ],
    ];

    /** @return list<string> */
    public static function all(): array
    {
        $all = [];
        foreach (self::MODULES as $module => [, $abilities]) {
            foreach ($abilities as $ability) {
                $all[] = "{$module}.{$ability}";
            }
        }

        return $all;
    }

    /**
     * Allowlist se bahar ke naam hatao; edit/delete ho to view apne aap (bina dekhe edit ka matlab nahi).
     *
     * @param  array<int, string>  $permissions
     * @return list<string>
     */
    public static function normalize(array $permissions): array
    {
        $valid = array_values(array_intersect(array_unique($permissions), self::all()));

        foreach ($valid as $name) {
            [$module] = explode('.', $name, 2);
            $valid[] = "{$module}.view";
        }

        return array_values(array_intersect(self::all(), array_unique($valid)));
    }

    /** Frontend matrix ke liye: [{module, label, abilities}] */
    public static function matrix(): array
    {
        return collect(self::MODULES)
            ->map(fn (array $m, string $module) => ['module' => $module, 'label' => $m[0], 'abilities' => $m[1]])
            ->values()
            ->all();
    }
}
