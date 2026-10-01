<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Buyer;
use App\Models\Customer;
use App\Services\LoginOtpService;
use App\Support\Phone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * /me/account — naam, aur mobile number verify karna/badalna. Mobile se login tabhi chalta hai jab number
 * yahan (ya kharid ke turant baad) SMS code se confirm hua ho.
 */
class AccountController extends Controller
{
    use ResolvesCustomer;

    public const PURPOSE = 'customer_phone_verify';

    private const PENDING = 'customer.phone_change';

    public function __construct(private LoginOtpService $otp) {}

    public function show(Request $request)
    {
        $buyer = $this->me();
        $pending = $request->session()->get(self::PENDING);

        return Inertia::render('Customer/Account', [
            'account' => [
                'name' => $buyer->name,
                'email' => $buyer->email,
                'phone' => $buyer->phone,
                'phone_verified' => $buyer->phoneVerified(),
            ],
            'pendingPhone' => $pending,
            'resendIn' => $pending ? $this->otp->secondsUntilResend($buyer, self::PURPOSE) : 0,
            'status' => $request->session()->get('status'),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:150']]);
        $this->me()->forceFill(['name' => $data['name']])->save();

        return back()->with('status', 'Name saved.');
    }

    /** Naye (ya maujooda unverified) number pe SMS code bhejo. Number abhi badla nahi — code ke baad badlega. */
    public function sendPhoneCode(Request $request): RedirectResponse
    {
        $data = $request->validate(['phone' => ['required', 'string', 'regex:/^\+?[0-9 \-]{8,20}$/']]);
        $buyer = $this->me();
        $phone = Phone::normalize($data['phone']);

        if (Buyer::where('phone', $phone)->where('id', '!=', $buyer->id)->exists()) {
            throw ValidationException::withMessages(['phone' => 'This mobile number is already linked to another account.']);
        }

        if ($buyer->phone === $phone && $buyer->phoneVerified()) {
            throw ValidationException::withMessages(['phone' => 'This number is already verified.']);
        }

        try {
            if (! $this->otp->send($buyer, self::PURPOSE, $request, 'sms', $phone)) {
                throw ValidationException::withMessages(['phone' => 'Please wait a minute before requesting another code.']);
            }
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);

            throw ValidationException::withMessages(['phone' => 'We could not send an SMS right now. Please try again in a minute.']);
        }

        $request->session()->put(self::PENDING, $phone);

        return back()->with('status', 'Code sent by SMS.');
    }

    public function verifyPhone(Request $request): RedirectResponse
    {
        $data = $request->validate(['code' => ['required', 'digits:6']]);
        $buyer = $this->me();
        $phone = $request->session()->get(self::PENDING);

        if (! $phone) {
            throw ValidationException::withMessages(['code' => 'Request a code first.']);
        }

        $result = $this->otp->verify($buyer, self::PURPOSE, $data['code']);

        if ($result !== LoginOtpService::OK) {
            throw ValidationException::withMessages(['code' => LoginOtpService::message($result)]);
        }

        // code bhejne aur daalne ke beech kisi aur ne ye number le liya ho
        if (Buyer::where('phone', $phone)->where('id', '!=', $buyer->id)->exists()) {
            throw ValidationException::withMessages(['code' => 'This mobile number was just linked to another account.']);
        }

        $buyer->forceFill(['phone' => $phone, 'phone_verified_at' => now()])->save();

        // creators ki CRM rows me bhi naya number — jahan us store me wo number kisi aur row pe na ho
        foreach ($buyer->customers as $customer) {
            if (! Customer::where('creator_id', $customer->creator_id)->where('phone', $phone)->where('id', '!=', $customer->id)->exists()) {
                $customer->update(['phone' => $phone]);
            }
        }

        $request->session()->forget(self::PENDING);

        return back()->with('status', 'Mobile number verified. You can now sign in with it.');
    }
}
