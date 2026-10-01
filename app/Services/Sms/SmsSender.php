<?php

namespace App\Services\Sms;

/**
 * SMS bhejne ka ek hi raasta. Driver `config('services.sms.driver')` se chunta hai (AppServiceProvider):
 *  - log   → kuch bhejta nahi, log me likhta hai (local / tests)
 *  - msg91 → MSG91 OTP API
 * Naya provider jodna ho to bas ek aur class jo ye interface implement kare.
 */
interface SmsSender
{
    /**
     * Login/verify ka OTP bhejo. Fail ho to exception — caller (LoginOtpService) use pakad kar code radd karta hai.
     *
     * @param  string  $phone  normalized, jaise +919876543210
     */
    public function sendOtp(string $phone, string $code): void;
}
