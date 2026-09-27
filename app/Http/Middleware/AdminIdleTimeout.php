<?php

namespace App\Http\Middleware;

use App\Support\AdminAudit;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Admin 30 minute kuch na kare to logout — laptop khula chhoot jaye tab bhi. Session lifetime poori app
 * ki ek hai (creators ke liye 2 ghante), isliye admin ke liye alag se ye check.
 */
class AdminIdleTimeout
{
    public const IDLE_MINUTES = 30;

    private const KEY = 'admin.last_seen';

    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::guard('admin')->check()) {
            $lastSeen = (int) $request->session()->get(self::KEY, 0);

            if ($lastSeen && $lastSeen < now()->subMinutes(self::IDLE_MINUTES)->getTimestamp()) {
                AdminAudit::log('admin.idle_logout', Auth::guard('admin')->user());
                Auth::guard('admin')->logout();
                $request->session()->forget(self::KEY);
                $request->session()->regenerateToken();

                return redirect('/admin/login')->withErrors(['email' => 'You were signed out after 30 minutes of inactivity.']);
            }

            $request->session()->put(self::KEY, now()->getTimestamp());
        }

        return $next($request);
    }
}
