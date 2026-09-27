<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\LoginOtpService;
use App\Support\DeviceTracker;
use App\Support\PendingLogin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Show the login page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request, LoginOtpService $otp): RedirectResponse
    {
        $request->authenticate();
        $user = Auth::guard('web')->user();

        // 2FA on hai (sub-admin ke liye hamesha) — password sahi hone pe bhi abhi login nahi, pehle email code
        if ($user->two_factor_enabled || $user->isSubAdmin()) {
            Auth::guard('web')->logout();
            PendingLogin::start($request, 'web', $user, $request->boolean('remember'));
            $otp->send($user, TwoFactorLoginController::PURPOSE, $request);

            return redirect()->route('login.verify');
        }

        $request->session()->regenerate();
        DeviceTracker::recordLogin($user, $request);

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
