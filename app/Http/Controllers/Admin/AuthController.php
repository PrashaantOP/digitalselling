<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Services\LoginOtpService;
use App\Support\AdminAudit;
use App\Support\PendingLogin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Admin login: email + password → email OTP → tab jaake `admin` guard pe login.
 * Password sahi hone pe bhi OTP ke bina koi session nahi banta.
 */
class AuthController extends Controller
{
    private const GUARD = 'admin';

    private const PURPOSE = 'admin_login';

    /** Random password ka asli bcrypt hash (cost 12) — sirf timing barabar rakhne ke liye. */
    private const DUMMY_HASH = '$2y$12$U9I7yQGFBNyRXHRM6Fy2U.xmK2Ytcw3Ts6yydnMLiRITa/M3/YfK6';

    public function __construct(private LoginOtpService $otp) {}

    public function create()
    {
        return Inertia::render('Admin/Auth/Login');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $key = 'admin-login:' . Str::lower($data['email']) . '|' . $request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages(['email' => 'Too many attempts. Try again in ' . ceil(RateLimiter::availableIn($key) / 60) . ' minutes.']);
        }

        $admin = Admin::where('email', Str::lower($data['email']))->first();

        // admin na mile tab bhi hash check — response time se email exist hai ya nahi, pata na chale
        $ok = Hash::check($data['password'], $admin?->password ?? self::DUMMY_HASH);

        if (! $admin || ! $ok || ! $admin->is_active) {
            RateLimiter::hit($key, 15 * 60);
            AdminAudit::log('admin.login_failed', $admin, ['email' => $data['email'], 'reason' => ! $admin || ! $ok ? 'credentials' : 'inactive']);

            throw ValidationException::withMessages(['email' => 'These credentials do not match our records.']);
        }

        RateLimiter::clear($key);
        PendingLogin::start($request, self::GUARD, $admin);
        $this->otp->send($admin, self::PURPOSE, $request);
        AdminAudit::log('admin.otp_sent', $admin, [], $admin);

        return redirect('/admin/login/verify');
    }

    public function verifyForm(Request $request)
    {
        $admin = $this->pendingAdmin($request);

        if (! $admin) {
            return redirect('/admin/login')->withErrors(['email' => 'Your sign-in expired. Please log in again.']);
        }

        return Inertia::render('Admin/Auth/Verify', [
            'email' => self::maskEmail($admin->email),
            'resendIn' => $this->otp->secondsUntilResend($admin, self::PURPOSE),
        ]);
    }

    public function verify(Request $request): RedirectResponse
    {
        $admin = $this->pendingAdmin($request);

        if (! $admin) {
            return redirect('/admin/login')->withErrors(['email' => 'Your sign-in expired. Please log in again.']);
        }

        $data = $request->validate(['code' => ['required', 'digits:6']]);
        $result = $this->otp->verify($admin, self::PURPOSE, $data['code']);

        if ($result !== LoginOtpService::OK) {
            AdminAudit::log('admin.otp_failed', $admin, ['result' => $result], $admin);

            throw ValidationException::withMessages(['code' => LoginOtpService::message($result)]);
        }

        PendingLogin::clear($request, self::GUARD);
        Auth::guard(self::GUARD)->login($admin); // remember-me kabhi nahi
        $request->session()->regenerate();
        $request->session()->put('admin.last_seen', now()->getTimestamp());

        $admin->forceFill(['last_login_at' => now(), 'last_login_ip' => $request->ip()])->save();
        AdminAudit::log('admin.login', $admin, [], $admin);

        // intended URL creator side ka bhi ho sakta hai (same session) — sirf /admin/* pe hi wapas bhejo
        $intended = (string) $request->session()->pull('url.intended', '');

        return redirect(str_starts_with($intended, url('/admin')) ? $intended : '/admin');
    }

    public function resend(Request $request): RedirectResponse
    {
        $admin = $this->pendingAdmin($request);

        if (! $admin) {
            return redirect('/admin/login')->withErrors(['email' => 'Your sign-in expired. Please log in again.']);
        }

        if (! $this->otp->send($admin, self::PURPOSE, $request)) {
            throw ValidationException::withMessages(['code' => 'Please wait ' . $this->otp->secondsUntilResend($admin, self::PURPOSE) . ' seconds before requesting another code.']);
        }

        AdminAudit::log('admin.otp_sent', $admin, ['resend' => true], $admin);

        return back()->with('status', 'A new code is on its way.');
    }

    public function destroy(Request $request): RedirectResponse
    {
        AdminAudit::log('admin.logout', Auth::guard(self::GUARD)->user());

        Auth::guard(self::GUARD)->logout();
        $request->session()->forget('admin.last_seen');
        $request->session()->regenerateToken();

        return redirect('/admin/login');
    }

    private function pendingAdmin(Request $request): ?Admin
    {
        $pending = PendingLogin::get($request, self::GUARD);
        $admin = $pending ? Admin::find($pending['id']) : null;

        return $admin?->is_active ? $admin : null;
    }

    /** a****@gmail.com — pura email screen pe na dikhe */
    public static function maskEmail(string $email): string
    {
        [$user, $domain] = array_pad(explode('@', $email, 2), 2, '');

        return Str::substr($user, 0, 1) . str_repeat('*', max(Str::length($user) - 1, 3)) . '@' . $domain;
    }
}
