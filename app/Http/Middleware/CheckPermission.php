<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * alias: perm — usage: perm:courses.edit   (ya perm:a.view,b.view => koi ek bhi chalega)
 *
 * Creator (owner) ko sab kuch allowed. Sub-admin ke liye Spatie permission
 * (team = parent creator) check hoti hai. Spatie ka `permission:` middleware
 * na use karne ki wajah: owner creator ke paas Spatie role nahi hota.
 */
class CheckPermission
{
    public function handle(Request $request, Closure $next, string ...$permissions)
    {
        $user = $request->user();

        abort_unless($user, 401);

        if ($user->isCreator() || $user->isSuperAdmin()) {
            return $next($request);
        }

        abort_unless($user->isSubAdmin(), 403);

        $granted = $user->getAllPermissions()->pluck('name');

        abort_unless($granted->intersect($permissions)->isNotEmpty(), 403, 'You do not have permission to do this.');

        return $next($request);
    }
}
