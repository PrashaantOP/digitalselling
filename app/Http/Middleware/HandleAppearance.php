<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;

class HandleAppearance
{
    /**
     * Dark mode sirf creator dashboard (/dashboard…, /settings…) pe. Public store, checkout,
     * customer portal, admin, landing, auth hamesha light — creator ka design jaisa ka taisa.
     * Default light (cookie na ho to).
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $appearance = $request->cookie('appearance');

        View::share('appearance', in_array($appearance, ['light', 'dark', 'system'], true) ? $appearance : 'light');
        View::share('darkScope', $request->is('dashboard', 'dashboard/*', 'settings', 'settings/*'));

        return $next($request);
    }
}
