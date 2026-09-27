<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\LoginOtpService;
use App\Support\DeviceTracker;
use App\Support\PendingLogin;
use App\Support\TeamActivity;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/** Creator ne 2FA on kiya ho to login ka doosra step — email pe aaya 6-digit code. */
class TwoFactorLoginController extends Controller
{
    public const PURPOSE = 'creator_login';

    public function __construct(private LoginOtpService $otp) {}

    public function create(Request $request)
    {
        $user = $this->pendingUser($request);

        if (! $user) {
            return redirect()->route('login')->withErrors(['email' => 'Your sign-in expired. Please log in again.']);
        }

        return Inertia::render('auth/verify-otp', [
            'email' => AdminAuthController::maskEmail($user->email),
            'resendIn' => $this->otp->secondsUntilResend($user, self::PURPOSE),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $this->pendingUser($request);

        if (! $user) {
            return redirect()->route('login')->withErrors(['email' => 'Your sign-in expired. Please log in again.']);
        }

        $data = $request->validate(['code' => ['required', 'digits:6']]);
        $result = $this->otp->verify($user, self::PURPOSE, $data['code']);

        if ($result !== LoginOtpService::OK) {
            throw ValidationException::withMessages(['code' => LoginOtpService::message($result)]);
        }

        $pending = PendingLogin::get($request, 'web');
        PendingLogin::clear($request, 'web');

        Auth::guard('web')->login($user, (bool) ($pending['remember'] ?? false));
        $request->session()->regenerate();
        DeviceTracker::recordLogin($user, $request);

        if ($user->isSubAdmin() && $user->parent_creator_id) {
            TeamActivity::log($user->parent_creator_id, 'member.signed_in', $user->email, [], $user);
        }

        return redirect()->intended(route('dashboard', absolute: false));
    }

    public function resend(Request $request): RedirectResponse
    {
        $user = $this->pendingUser($request);

        if (! $user) {
            return redirect()->route('login')->withErrors(['email' => 'Your sign-in expired. Please log in again.']);
        }

        if (! $this->otp->send($user, self::PURPOSE, $request)) {
            throw ValidationException::withMessages(['code' => 'Please wait ' . $this->otp->secondsUntilResend($user, self::PURPOSE) . ' seconds before requesting another code.']);
        }

        return back()->with('status', 'A new code is on its way.');
    }

    private function pendingUser(Request $request): ?User
    {
        $pending = PendingLogin::get($request, 'web');
        $user = $pending ? User::find($pending['id']) : null;

        return $user && $user->status !== 'suspended' ? $user : null;
    }
}
