<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Log;

/** Local / tests: SMS bhejne ki jagah log me likh do, taaki bina provider ke bhi mobile login chal sake. */
class LogSmsSender implements SmsSender
{
    public function sendOtp(string $phone, string $code): void
    {
        Log::info("SMS OTP for {$phone}: {$code}");
    }
}
