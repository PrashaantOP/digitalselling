<?php

namespace App\Support;

use App\Mail\NewDeviceLoginMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * "Naye device se login hua" — har browser ko ek lamba random cookie (`dvc`, encrypted) milta hai; uska
 * sha256 user_devices me. Login pe cookie wala device us user ke liye naya ho to creator ko email.
 */
class DeviceTracker
{
    public const COOKIE = 'dvc';

    private const COOKIE_MINUTES = 60 * 24 * 365 * 5;

    /** @param bool $notify registration pe false — pehla hi device hai, email ka matlab nahi */
    public static function recordLogin(User $user, Request $request, bool $notify = true): void
    {
        $token = (string) $request->cookie(self::COOKIE);

        if (strlen($token) < 32) {
            $token = Str::random(48);
        }

        // cookie har login pe refresh (5 saal) — http-only, same-site lax
        Cookie::queue(Cookie::make(self::COOKIE, $token, self::COOKIE_MINUTES, '/', null, $request->isSecure(), true, false, 'Lax'));

        $hash = hash('sha256', $token);
        $known = DB::table('user_devices')->where('user_id', $user->id)->where('device_hash', $hash)->exists();

        DB::table('user_devices')->updateOrInsert(
            ['user_id' => $user->id, 'device_hash' => $hash],
            [
                'user_agent' => substr((string) $request->userAgent(), 0, 255),
                'last_ip' => $request->ip(),
                'last_seen_at' => now(),
                'updated_at' => now(),
            ] + ($known ? [] : ['created_at' => now()]),
        );

        if (! $known && $notify && $user->email) {
            try {
                Mail::to($user->email)->send(new NewDeviceLoginMail($user->name ?? '', $request->ip(), (string) $request->userAgent(), now()));
            } catch (\Throwable $e) {
                report($e); // mail fail hone se login fail nahi hona chahiye
            }
        }
    }

    /** "Chrome on Windows" jaisa chhota label — sessions list aur email ke liye. */
    public static function describe(?string $userAgent): string
    {
        $ua = (string) $userAgent;

        $browser = match (true) {
            str_contains($ua, 'Edg/') => 'Edge',
            str_contains($ua, 'OPR/') || str_contains($ua, 'Opera') => 'Opera',
            str_contains($ua, 'Firefox/') => 'Firefox',
            str_contains($ua, 'Chrome/') => 'Chrome',
            str_contains($ua, 'Safari/') => 'Safari',
            default => 'Unknown browser',
        };

        $os = match (true) {
            str_contains($ua, 'Windows') => 'Windows',
            str_contains($ua, 'Android') => 'Android',
            str_contains($ua, 'iPhone') || str_contains($ua, 'iPad') => 'iOS',
            str_contains($ua, 'Mac OS X') => 'macOS',
            str_contains($ua, 'Linux') => 'Linux',
            default => 'unknown OS',
        };

        return "{$browser} on {$os}";
    }
}
