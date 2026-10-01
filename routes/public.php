<?php

use App\Http\Controllers\OrderController;
use App\Http\Controllers\Public\BookCheckoutController;
use App\Http\Controllers\Public\BookingPageController;
use App\Http\Controllers\Public\CertificateVerifyController;
use App\Http\Controllers\Public\CourseCheckoutController;
use App\Http\Controllers\Public\EventCheckoutController;
use App\Http\Controllers\Public\LinkClickController;
use App\Http\Controllers\Public\LockedContentCheckoutController;
use App\Http\Controllers\Public\PaymentPageCheckoutController;
use App\Http\Controllers\Public\StorefrontController;
use App\Http\Controllers\Settings\CreatorProfileController;
use Illuminate\Support\Facades\Route;

/*
| Guest / public routes. web.php me sabse LAST include hota hai.
*/

// ---- Product / checkout pages ----
$pages = ['throttle:120,1', 'track.visit'];
Route::get('/c/{slug}', [CourseCheckoutController::class, 'show'])->middleware($pages)->name('course.show');
// Free preview: creator ke chune hue lessons bina kharide
Route::get('/c/{slug}/preview/{lessonUuid}', [CourseCheckoutController::class, 'preview'])->middleware('throttle:60,1')->name('course.preview');
Route::get('/c/{slug}/preview/{lessonUuid}/files/{fileUuid}', [CourseCheckoutController::class, 'previewFile'])->middleware('throttle:30,1')->name('course.preview.file');
Route::get('/e/{slug}', [EventCheckoutController::class, 'show'])->middleware($pages)->name('event.show');
Route::get('/b/{slug}', [BookCheckoutController::class, 'show'])->middleware($pages)->name('book.show');
Route::get('/l/{slug}', [LockedContentCheckoutController::class, 'show'])->middleware($pages)->name('locked.show');
Route::get('/p/{slug}', [PaymentPageCheckoutController::class, 'show'])->middleware($pages)->name('payment-page.show');

Route::post('/checkout/{checkoutProduct}/order', [OrderController::class, 'store'])
    ->middleware('throttle:10,1')->name('checkout.order');
Route::post('/checkout/{checkoutProduct}/quote', [OrderController::class, 'quote'])
    ->middleware('throttle:60,1')->name('checkout.quote');
// Razorpay Checkout.js ka success handler — signature verify karke access deta hai
Route::post('/checkout/verify', [OrderController::class, 'verify'])
    ->middleware('throttle:20,1')->name('checkout.verify');

// ---- Certificate verify: koi bhi number se asliyat check kare ----
Route::get('/certificates', [CertificateVerifyController::class, 'index'])->middleware('throttle:30,1')->name('certificates.verify');
Route::get('/certificates/{certificateNumber}', [CertificateVerifyController::class, 'show'])
    ->where('certificateNumber', '[A-Za-z0-9\-]{4,40}')->middleware('throttle:30,1')->name('certificates.show');

// ---- Public booking page ----
Route::get('/book/{username}', [BookingPageController::class, 'show'])->middleware($pages)->name('booking-page.show');
Route::get('/book/{username}/slots', [BookingPageController::class, 'availableSlots'])->middleware('throttle:60,1')->name('booking-page.slots');
Route::post('/book/{username}/{serviceSlug}', [BookingPageController::class, 'store'])->middleware('throttle:10,1')->name('booking-page.store');

// ---- Analytics: link click beacon ----
Route::post('/track/click', [LinkClickController::class, 'store'])->middleware('throttle:60,1')->name('track.click');

// ---- Webapp: /w/{username} (catch-all se pehle hona zaroori) ----
Route::get('/w/{username}', [StorefrontController::class, 'webapp'])
    ->where('username', '[A-Za-z0-9_.\-]+')
    ->middleware($pages)
    ->name('webapp.show');

// PWA manifest — per creator (install karne pe uska naam/icon/colour dikhe)
Route::get('/w/{username}/manifest.webmanifest', [StorefrontController::class, 'manifest'])
    ->where('username', '[A-Za-z0-9_.\-]+')
    ->middleware('throttle:120,1')
    ->name('webapp.manifest');

// ---- Storefront: catch-all, ABSOLUTE LAST ----
$reserved = implode('|', array_map('preg_quote', CreatorProfileController::RESERVED_USERNAMES));

Route::get('/{username}', [StorefrontController::class, 'show'])
    ->where('username', "(?!(?:{$reserved})$)[A-Za-z0-9_.\\-]+")
    ->middleware($pages)
    ->name('storefront.show');
