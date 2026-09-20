<?php

namespace App\Http\Middleware;

use App\Support\Tenant;
use Closure;
use Illuminate\Http\Request;
use Spatie\Permission\PermissionRegistrar;

/** alias: set.team.context — Spatie teams ke liye creator id set karta hai. */
class SetTeamContext
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if ($user) {
            $teamId = Tenant::id();
            abort_if(! $teamId, 403, 'No creator context for this account.');

            app(PermissionRegistrar::class)->setPermissionsTeamId($teamId);
        }

        return $next($request);
    }
}
