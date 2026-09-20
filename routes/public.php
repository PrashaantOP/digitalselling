<?php

use App\Http\Controllers\OrderController;
use App\Http\Controllers\Public\BookCheckoutController;
use App\Http\Controllers\Public\BookingPageController;
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
Route::get('/e/{slug}', [EventCheckoutController::class, 'show'])->middleware($pages)->name('event.show');
Route::get('/b/{slug}', [BookCheckoutController::class, 'show'])->middleware($pages)->name('book.show');
Route::get('/l/{slug}', [LockedContentCheckoutController::class, 'show'])->middleware($pages)->name('locked.show');
Route::get('/p/{slug}', [PaymentPageCheckoutController::class, 'show'])->middleware($pages)->name('payment-page.show');

Route::post('/checkout/{checkoutProduct}/order', [OrderController::class, 'store'])
    ->whereNumber('checkoutProduct')->middleware('throttle:10,1')->name('checkout.order');

// ---- Public booking page ----
Route::get('/book/{username}', [BookingPageController::class, 'show'])->middleware($pages)->name('booking-page.show');
Route::get('/book/{username}/slots', [BookingPageController::class, 'availableSlots'])->middleware('throttle:60,1')->name('booking-page.slots');
Route::post('/book/{username}/{serviceSlug}', [BookingPageController::class, 'store'])->middleware('throttle:10,1')->name('booking-page.store');

// ---- Analytics: link click beacon ----
Route::post('/track/click', [LinkClickController::class, 'store'])->middleware('throttle:60,1')->name('track.click');

// ---- Storefront: catch-all, ABSOLUTE LAST ----
$reserved = implode('|', array_map('preg_quote', CreatorProfileController::RESERVED_USERNAMES));

Route::get('/{username}', [StorefrontController::class, 'show'])
    ->where('username', "(?!(?:{$reserved})$)[A-Za-z0-9_.\\-]+")
    ->middleware($pages)
    ->name('storefront.show');
