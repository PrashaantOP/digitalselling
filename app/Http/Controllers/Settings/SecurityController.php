<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Mail\SecurityNoticeMail;
use App\Services\LoginOtpService;
use App\Support\DeviceTracker;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Settings → Security: kahan-kahan logged in ho (sessions table — SESSION_DRIVER=database),
 * baaki sab devices se logout, aur email OTP wala two-step verification on/off.
 */
class SecurityController extends Controller
{
    private const SETUP_PURPOSE = 'creator_2fa_setup';

    public function __construct(private LoginOtpService $otp) {}

    public function edit(Request $request)
    {
        $user = $request->user();
        $current = $request->session()->getId();

        $sessions = DB::table('sessions')->where('user_id', $user->id)->orderByDesc('last_activity')->get()
            ->map(fn ($s) => [
                // session id kabhi frontend ko nahi — sirf "ye wala device hai" ka flag
                'device' => DeviceTracker::describe($s->user_agent),
                'ip' => $s->ip_address,
                'last_active' => date(DATE_ATOM, (int) $s->last_activity),
                'is_current' => $s->id === $current,
            ]);

        return Inertia::render('settings/security', [
            'sessions' => $sessions,
            'twoFactorEnabled' => (bool) $user->two_factor_enabled || $user->isSubAdmin(),
            'twoFactorLocked' => $user->isSubAdmin(),
            'twoFactorPending' => (bool) $request->session()->get('two_factor_setup'),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function destroyOtherSessions(Request $request): RedirectResponse
    {
        $request->validate(['password' => ['required', 'current_password']]);
        $user = $request->user();

        // dusre devices ke "remember me" cookies bhi bekaar — warna wo cookie se dobara login ho jaate
        $user->forceFill(['remember_token' => \Illuminate\Support\Str::random(60)])->save();
        DB::table('sessions')->where('user_id', $user->id)->where('id', '!=', $request->session()->getId())->delete();
        SecurityNoticeMail::deliver($user->email, 'sessions_revoked', $user->name, $request);

        return back()->with('status', 'Signed out of all other devices.');
    }

    /** Step 1: password confirm → email pe test code (taaki pata ho ki email sach me pahunchta hai). */
    public function sendTwoFactorCode(Request $request): RedirectResponse
    {
        $request->validate(['password' => ['required', 'current_password']]);
        $user = $request->user();

        if (! $this->otp->send($user, self::SETUP_PURPOSE, $request)) {
            throw ValidationException::withMessages(['password' => 'Please wait ' . $this->otp->secondsUntilResend($user, self::SETUP_PURPOSE) . ' seconds before requesting another code.']);
        }

        $request->session()->put('two_factor_setup', true);

        return back()->with('status', "We've emailed you a 6-digit code.");
    }

    /** Step 2: code sahi → 2FA on. */
    public function enableTwoFactor(Request $request): RedirectResponse
    {
        abort_unless($request->session()->get('two_factor_setup'), 422, 'Request a code first.');
        $data = $request->validate(['code' => ['required', 'digits:6']]);

        $result = $this->otp->verify($request->user(), self::SETUP_PURPOSE, $data['code']);
        if ($result !== LoginOtpService::OK) {
            throw ValidationException::withMessages(['code' => LoginOtpService::message($result)]);
        }

        $request->user()->forceFill(['two_factor_enabled' => true])->save();
        $request->session()->forget('two_factor_setup');

        return back()->with('status', 'Two-step verification is on. We will email you a code each time you sign in.');
    }

    public function disableTwoFactor(Request $request): RedirectResponse
    {
        abort_if($request->user()->isSubAdmin(), 403, 'Two-step verification is required for team members.');

        $request->validate(['password' => ['required', 'current_password']]);

        $request->user()->forceFill(['two_factor_enabled' => false])->save();
        SecurityNoticeMail::deliver($request->user()->email, 'two_factor_disabled', $request->user()->name, $request);

        return back()->with('status', 'Two-step verification is off.');
    }
}
