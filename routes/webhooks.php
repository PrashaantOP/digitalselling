<?php

use App\Http\Controllers\Webhooks\InstagramWebhookController;
use App\Http\Controllers\Webhooks\RazorpayWebhookController;
use App\Http\Controllers\Webhooks\SubscriptionWebhookController;
use Illuminate\Support\Facades\Route;

/*
| Webhooks — NO session / CSRF / auth (bootstrap/app.php me `then:` se bina middleware ke register hota hai).
| Har controller apni signature verify karta hai.
*/
Route::prefix('webhooks')->group(function () {
    Route::post('razorpay', [RazorpayWebhookController::class, 'handle'])->name('razorpay.webhook');
    Route::post('razorpay-subscription', [SubscriptionWebhookController::class, 'handle'])->name('razorpay-sub.webhook');

    Route::get('instagram', [InstagramWebhookController::class, 'verify'])->name('instagram.verify');
    Route::post('instagram', [InstagramWebhookController::class, 'handle'])->name('instagram.webhook');
});
