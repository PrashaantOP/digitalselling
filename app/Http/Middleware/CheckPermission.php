<?php

namespace App\Http\Middleware;

use App\Support\TeamAccess;
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

        // owner sab kuch; sub-admin ke paas inme se koi ek permission ho (TeamAccess ek hi jagah ka rule)
        $allowed = collect($permissions)->contains(fn (string $p) => TeamAccess::can($user, $p));

        abort_unless($allowed, 403, 'You do not have permission to do this.');

        return $next($request);
    }
}
