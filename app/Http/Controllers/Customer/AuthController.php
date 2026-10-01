<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Buyer;
use App\Services\LoginOtpService;
use App\Support\Phone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Customer portal (/me) ka login — password nahi, sirf OTP.
 *  - Email daalo → us email pe code.
 *  - Mobile daalo → SMS code, par SIRF tab jab wo number us buyer ne verify kiya ho. Checkout pe likha
 *    number verify nahi hota; uspe login chalne dete to galat number likhne wale ka account kisi aur ko mil jaata.
 *
 * Account hai ya nahi ye screen kabhi nahi batati — har haal me wahi message aur wahi agla page.
 */
class AuthController extends Controller
{
    public const EMAIL = 'customer_login_email';

    public const SMS = 'customer_login_sms';

    private const PENDING = 'customer.pending';

    private const WRONG_CODE = 'That code is not correct.';

    public function __construct(private LoginOtpService $otp) {}

    public function create(Request $request)
    {
        return Inertia::render('Customer/Login', [
            'prefill' => Str::limit((string) $request->query('email', ''), 150, ''),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate(['login' => ['required', 'string', 'max:150']]);
        $login = trim($data['login']);
        $isEmail = str_contains($login, '@');

        if ($isEmail) {
            $request->validate(['login' => ['email']]);
            $buyer = Buyer::where('email', Str::lower($login))->first();
        } else {
            $request->validate(['login' => ['regex:/^\+?[0-9 \-]{8,20}$/']], ['login.regex' => 'Enter your email address or mobile number.']);
            $buyer = Buyer::where('phone', Phone::normalize($login))->first();

            // unverified number pe SMS login nahi — is buyer ko "anjaan" hi maano
            if ($buyer && ! $buyer->phoneVerified()) {
                $buyer = null;
            }
        }

        if ($buyer) {
            try {
                // cooldown baaki ho to pichhla code hi chalega — false ko error mat banao (account hone ka pata chal jaata)
                $this->otp->send($buyer, $isEmail ? self::EMAIL : self::SMS, $request, $isEmail ? 'email' : 'sms');
            } catch (\Throwable $e) {
                report($e);

                throw ValidationException::withMessages(['login' => $isEmail
                    ? 'We could not send the code right now. Please try again in a minute.'
                    : 'We could not send an SMS right now. Please sign in with your email instead.']);
            }
        }

        $request->session()->put(self::PENDING, [
            'buyer' => $buyer?->id,
            'channel' => $isEmail ? 'email' : 'sms',
            'to' => $isEmail ? Str::lower($login) : Phone::normalize($login),
        ]);

        return redirect('/me/login/verify');
    }

    public function verifyForm(Request $request)
    {
        $pending = $request->session()->get(self::PENDING);

        if (! $pending) {
            return redirect('/me/login');
        }

        $buyer = $pending['buyer'] ? Buyer::find($pending['buyer']) : null;

        return Inertia::render('Customer/Verify', [
            'channel' => $pending['channel'],
            // user ne khud jo likha wahi dikhao — DB se kuch nahi
            'to' => $pending['to'],
            'resendIn' => $buyer
                ? $this->otp->secondsUntilResend($buyer, $pending['channel'] === 'email' ? self::EMAIL : self::SMS)
                : LoginOtpService::RESEND_COOLDOWN_SECONDS,
            'status' => $request->session()->get('status'),
        ]);
    }

    public function verify(Request $request): RedirectResponse
    {
        $pending = $request->session()->get(self::PENDING);

        if (! $pending) {
            return redirect('/me/login');
        }

        $data = $request->validate(['code' => ['required', 'digits:6']]);
        $buyer = $pending['buyer'] ? Buyer::find($pending['buyer']) : null;

        if (! $buyer) {
            throw ValidationException::withMessages(['code' => self::WRONG_CODE]);
        }

        $result = $this->otp->verify($buyer, $pending['channel'] === 'email' ? self::EMAIL : self::SMS, $data['code']);

        if ($result !== LoginOtpService::OK) {
            throw ValidationException::withMessages(['code' => LoginOtpService::message($result)]);
        }

        $request->session()->forget(self::PENDING);

        return redirect(self::signIn($request, $buyer, $pending['channel']));
    }

    public function resend(Request $request): RedirectResponse
    {
        $pending = $request->session()->get(self::PENDING);

        if (! $pending) {
            return redirect('/me/login');
        }

        $buyer = $pending['buyer'] ? Buyer::find($pending['buyer']) : null;

        if ($buyer) {
            $channel = $pending['channel'];

            try {
                if (! $this->otp->send($buyer, $channel === 'email' ? self::EMAIL : self::SMS, $request, $channel)) {
                    throw ValidationException::withMessages(['code' => 'Please wait a minute before requesting another code.']);
                }
            } catch (ValidationException $e) {
                throw $e;
            } catch (\Throwable $e) {
                report($e);

                throw ValidationException::withMessages(['code' => 'We could not send the code right now. Please try again in a minute.']);
            }
        }

        return back()->with('status', 'If this account exists, a new code is on its way.');
    }

    public function destroy(Request $request): RedirectResponse
    {
        // sirf customer guard — usi browser me creator/admin login ho to wo chalta rahe
        Auth::guard('customer')->logout();
        $request->session()->forget(self::PENDING);
        $request->session()->regenerateToken();

        return redirect('/me/login');
    }

    /**
     * OTP sahi nikla — buyer ko login karo. Jis channel se code aaya wo ab verified hai.
     * Returns: kahan bhejna hai (sirf /me ke andar — intended URL creator/admin side ka bhi ho sakta hai).
     */
    public static function signIn(Request $request, Buyer $buyer, string $channel, ?string $fallback = null): string
    {
        $buyer->forceFill([
            'email_verified_at' => $channel === 'email' ? ($buyer->email_verified_at ?? now()) : $buyer->email_verified_at,
            'phone_verified_at' => $channel === 'sms' ? ($buyer->phone_verified_at ?? now()) : $buyer->phone_verified_at,
            'last_login_at' => now(),
        ])->save();

        Auth::guard('customer')->login($buyer, true);
        $request->session()->regenerate();

        $intended = (string) $request->session()->pull('url.intended', '');
        $path = (string) parse_url($intended, PHP_URL_PATH);

        return $fallback ?? (str_starts_with($path, '/me/') && ! str_starts_with($path, '/me/login') ? $intended : '/me/courses');
    }
}
