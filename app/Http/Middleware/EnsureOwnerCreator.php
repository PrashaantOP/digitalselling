<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/** alias: owner — sirf owner creator (sub-admin nahi). Roadmap ka `role:creator`. */
class EnsureOwnerCreator
{
    public function handle(Request $request, Closure $next)
    {
        abort_unless($request->user()?->isCreator(), 403, 'Only the account owner can do this.');

        return $next($request);
    }
}
