<?php

namespace App\Support;

/**
 * Phone ko ek hi shakal me lao (+919876543210) — buyers.phone unique hai, aur "9876543210",
 * "+91 98765 43210", "098765 43210" teeno ek hi number hain. Compare/save se pehle hamesha yahi.
 */
class Phone
{
    public static function normalize(?string $phone): ?string
    {
        $raw = trim((string) $phone);
        $digits = preg_replace('/\D+/', '', $raw);

        if ($digits === '' || $digits === null) {
            return null;
        }

        // "+…" likha ho to country code de diya gaya hai
        if (str_starts_with($raw, '+')) {
            return '+' . $digits;
        }

        // Indian mobile: 10 digit, ya aage 0 / 91 laga ho
        if (strlen($digits) === 11 && $digits[0] === '0') {
            $digits = substr($digits, 1);
        }

        if (strlen($digits) === 10) {
            return '+91' . $digits;
        }

        return '+' . $digits;
    }

    /** Screen/mail pe dikhane ke liye: +91••••••3210 */
    public static function mask(?string $phone): string
    {
        $phone = (string) $phone;

        return strlen($phone) > 6 ? substr($phone, 0, 3) . str_repeat('•', strlen($phone) - 7) . substr($phone, -4) : $phone;
    }
}
