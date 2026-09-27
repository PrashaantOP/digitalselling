<?php

namespace App\Support;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

/**
 * Password sahi ho gaya par OTP baaki hai — tab tak user logged-in NAHI hota. Session me sirf ye
 * yaad rakhte hain ki kaun, kis guard ke liye, aur kab tak (10 min). OTP sahi hone pe hi asli login.
 */
class PendingLogin
{
    private const KEY = 'pending_login';

    private const TTL_MINUTES = 10;

    public static function start(Request $request, string $guard, Authenticatable $user, bool $remember = false): void
    {
        $request->session()->put(self::KEY . ".{$guard}", [
            'id' => $user->getAuthIdentifier(),
            'remember' => $remember,
            'expires_at' => now()->addMinutes(self::TTL_MINUTES)->getTimestamp(),
        ]);
    }

    /** @return array{id: int, remember: bool}|null */
    public static function get(Request $request, string $guard): ?array
    {
        $data = $request->session()->get(self::KEY . ".{$guard}");

        if (! $data || $data['expires_at'] < now()->getTimestamp()) {
            self::clear($request, $guard);

            return null;
        }

        return ['id' => (int) $data['id'], 'remember' => (bool) $data['remember']];
    }

    public static function clear(Request $request, string $guard): void
    {
        $request->session()->forget(self::KEY . ".{$guard}");
    }
}
