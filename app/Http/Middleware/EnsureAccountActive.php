<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Creator / sub-admin ka account session ke beech suspend ho jaye (admin ne band kiya, sub-admin
 * revoke hua) to agli hi request pe logout — purana session chalta na rahe.
 */
class EnsureAccountActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::guard('web')->user();

        // sub-admin ka creator (tenant) suspend ho gaya to sub-admin bhi us store pe kaam nahi kar sakta
        $blocked = $user && ($user->status === 'suspended'
            || ($user->isSubAdmin() && $user->parentCreator?->status === 'suspended'));

        if ($blocked) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            if ($request->expectsJson()) {
                abort(403, 'Your account is suspended.');
            }

            return redirect()->route('login')->withErrors(['email' => 'Your account is suspended. Please contact support.']);
        }

        return $next($request);
    }
}
