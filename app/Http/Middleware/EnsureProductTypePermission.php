<?php

namespace App\Http\Middleware;

use App\Models\Product;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * alias: perm.product
 *
 * Coupons / checkout-questions / addons / cover-images ki routes saare product types pe
 * chalti hain, isliye pehle `perm:` ka OR-list laga tha — aur CheckPermission us list me se
 * kisi ek permission pe bhi pass kar deta hai. Matlab sirf `books.edit` wala sub-admin
 * flagship course pe 100%-off coupon bana sakta tha ({product} binding type-agnostic hai).
 *
 * Yahan bound product ka apna type dekh kar usi module ka permission check hota hai.
 */
class EnsureProductTypePermission
{
    private const MODULES = [
        'course' => 'courses',
        'event' => 'events',
        'book' => 'books',
        'locked_content' => 'locked-content',
        'payment_page' => 'payment-pages',
        'booking' => 'bookings',
    ];

    public function handle(Request $request, Closure $next, string $ability = 'edit')
    {
        $user = $request->user();

        abort_unless($user, 401);

        if ($user->isCreator() || $user->isSuperAdmin()) {
            return $next($request);
        }

        abort_unless($user->isSubAdmin(), 403);

        $product = $this->resolveProduct($request);
        $module = $product ? (self::MODULES[$product->type] ?? null) : null;

        abort_unless($module, 403);

        $granted = $user->getAllPermissions()->pluck('name');

        abort_unless($granted->contains("{$module}.{$ability}"), 403, 'You do not have permission to do this.');

        return $next($request);
    }

    /** Route pe ya to {product} hota hai, ya uska child ({coupon}, {addon}...). */
    private function resolveProduct(Request $request): ?Product
    {
        foreach ($request->route()->parameters() as $value) {
            if ($value instanceof Product) {
                return $value;
            }

            if ($value instanceof Model && method_exists($value, 'product')) {
                return $value->product;
            }
        }

        return null;
    }
}
