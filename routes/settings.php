<?php

use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');

    Route::put('settings/password', [PasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('password.update');

    // Security: active sessions + email OTP two-step verification
    Route::get('settings/security', [SecurityController::class, 'edit'])->name('security.edit');
    Route::delete('settings/security/sessions', [SecurityController::class, 'destroyOtherSessions'])->middleware('throttle:6,1')->name('security.sessions.destroy');
    Route::post('settings/security/two-factor/code', [SecurityController::class, 'sendTwoFactorCode'])->middleware('throttle:6,1')->name('security.two-factor.code');
    Route::post('settings/security/two-factor', [SecurityController::class, 'enableTwoFactor'])->middleware('throttle:login-ip')->name('security.two-factor.enable');
    Route::delete('settings/security/two-factor', [SecurityController::class, 'disableTwoFactor'])->middleware('throttle:6,1')->name('security.two-factor.disable');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');
});
