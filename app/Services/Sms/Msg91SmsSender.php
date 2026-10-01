<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Http;

/**
 * MSG91 OTP API (https://control.msg91.com/api/v5/otp). Template DLT-approved hona chahiye aur usme
 * OTP ka variable `##OTP##` ho. Keys: services.msg91.auth_key / otp_template_id (sender id template me hota hai).
 */
class Msg91SmsSender implements SmsSender
{
    public function sendOtp(string $phone, string $code): void
    {
        $response = Http::withHeaders(['authkey' => (string) config('services.msg91.auth_key')])
            ->acceptJson()->asJson()->timeout(15)
            ->post('https://control.msg91.com/api/v5/otp', [
                'template_id' => (string) config('services.msg91.otp_template_id'),
                'mobile' => ltrim($phone, '+'), // MSG91 country code ke saath, bina "+"
                'otp' => $code,
            ])
            ->throw();

        // MSG91 galti pe bhi 200 de sakta hai — body me type=error
        if (($response->json('type') ?? 'success') === 'error') {
            throw new \RuntimeException('MSG91: ' . ($response->json('message') ?? 'SMS could not be sent.'));
        }
    }
}
