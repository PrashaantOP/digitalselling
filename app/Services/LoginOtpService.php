<?php

namespace App\Services;

use App\Mail\LoginOtpMail;
use App\Models\LoginOtp;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

/**
 * Email OTP — login ka doosra step. Admin ke liye har login pe, creator ke liye jab 2FA on ho.
 *
 * - Code 6 digit, sirf hash DB me; 10 minute valid.
 * - Ek code pe 5 galat try → wo code khatam, naya maangna padega.
 * - Resend: 60 second cooldown, ghante me max 5.
 */
class LoginOtpService
{
    public const TTL_MINUTES = 10;

    public const MAX_ATTEMPTS = 5;

    public const RESEND_COOLDOWN_SECONDS = 60;

    public const MAX_SENDS_PER_HOUR = 5;

    public const OK = 'ok';

    public const INVALID = 'invalid';

    public const EXPIRED = 'expired';

    public const LOCKED = 'locked';

    /** Kitne second baad naya code bhej sakte hain (0 = abhi). */
    public function secondsUntilResend(Model $who, string $purpose): int
    {
        $recent = $this->query($who, $purpose)->where('created_at', '>=', now()->subHour());

        if ((clone $recent)->count() >= self::MAX_SENDS_PER_HOUR) {
            $oldest = (clone $recent)->oldest()->value('created_at');

            return max(1, (int) now()->diffInSeconds($oldest->copy()->addHour(), false));
        }

        $last = $this->query($who, $purpose)->latest('id')->value('created_at');

        return $last ? max(0, (int) now()->diffInSeconds($last->copy()->addSeconds(self::RESEND_COOLDOWN_SECONDS), false)) : 0;
    }

    /** Naya code bhejo (purane sab bekaar). Cooldown baaki ho to false. */
    public function send(Model $who, string $purpose, Request $request): bool
    {
        if ($this->secondsUntilResend($who, $purpose) > 0) {
            return false;
        }

        // pichhla koi bhi code ab kaam nahi karega
        $this->query($who, $purpose)->whereNull('consumed_at')->update(['consumed_at' => now()]);

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $otp = new LoginOtp([
            'purpose' => $purpose,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
            'ip' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
        ]);
        $otp->authenticatable()->associate($who);
        $otp->save();

        Mail::to($who->email)->send(new LoginOtpMail($code, $who->name ?? '', $purpose, $request->ip(), (string) $request->userAgent()));

        return true;
    }

    public function verify(Model $who, string $purpose, string $code): string
    {
        $otp = $this->query($who, $purpose)->whereNull('consumed_at')->latest('id')->first();

        if (! $otp) {
            return self::EXPIRED;
        }

        if ($otp->expires_at->isPast()) {
            $otp->forceFill(['consumed_at' => now()])->save();

            return self::EXPIRED;
        }

        if ($otp->attempts >= self::MAX_ATTEMPTS) {
            return self::LOCKED;
        }

        $otp->increment('attempts');

        if (! Hash::check(trim($code), $otp->code_hash)) {
            if ($otp->attempts >= self::MAX_ATTEMPTS) {
                $otp->forceFill(['consumed_at' => now()])->save();

                return self::LOCKED;
            }

            return self::INVALID;
        }

        $otp->forceFill(['consumed_at' => now()])->save();

        return self::OK;
    }

    public static function message(string $result): string
    {
        return match ($result) {
            self::EXPIRED => 'This code has expired. Request a new one.',
            self::LOCKED => 'Too many wrong attempts. Request a new code.',
            default => 'That code is not correct.',
        };
    }

    private function query(Model $who, string $purpose)
    {
        return LoginOtp::query()
            ->where('authenticatable_type', $who->getMorphClass())
            ->where('authenticatable_id', $who->getKey())
            ->where('purpose', $purpose);
    }
}
