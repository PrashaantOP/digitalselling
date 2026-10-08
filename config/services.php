<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    // Plus plan billing (aur aage buyer checkout). Webhook: POST /webhooks/razorpay
    'razorpay' => [
        'key_id' => env('RAZORPAY_KEY_ID'),
        'key_secret' => env('RAZORPAY_KEY_SECRET'),
        'webhook_secret' => env('RAZORPAY_WEBHOOK_SECRET'),
        // Plus plan auto-renew ka Razorpay plan id — `php artisan billing:razorpay-plan` se banta hai
        'plus_plan_id' => env('RAZORPAY_PLUS_PLAN_ID'),
    ],

    // Customer portal ka mobile login OTP. driver: log (local/test — SMS log me) | msg91
    'sms' => [
        'driver' => env('SMS_DRIVER', 'log'),
    ],

    'msg91' => [
        'auth_key' => env('MSG91_AUTH_KEY'),
        'sender_id' => env('MSG91_SENDER_ID'),
        'otp_template_id' => env('MSG91_OTP_TEMPLATE_ID'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
