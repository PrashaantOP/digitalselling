<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/** `php artisan admin:deactivate` ke baad chalu admin session agli request pe hi khatam. */
class EnsureAdminActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $admin = Auth::guard('admin')->user();

        if ($admin && ! $admin->is_active) {
            Auth::guard('admin')->logout();
            $request->session()->regenerateToken();

            return redirect('/admin/login')->withErrors(['email' => 'This admin account is disabled.']);
        }

        return $next($request);
    }
}
