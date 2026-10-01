<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ReferralService;
use App\Support\DeviceTracker;
use App\Support\PlanPricing;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Show the registration page.
     */
    public function create(Request $request): Response
    {
        // ?ref= session me rakho — user register karne se pehle idhar-udhar ghoome to bhi code na khoye
        if ($code = $request->query('ref')) {
            $request->session()->put('referral_code', substr((string) $code, 0, 20));
        }

        return Inertia::render('auth/register', [
            'referralCode' => $request->session()->get('referral_code'),
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        // honeypot: insaan ko ye field dikhta hi nahi — bot bhar deta hai. Chup-chaap wapas bhejo.
        if (filled($request->input('website'))) {
            return redirect()->route('register');
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:' . User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // Har naya creator 90 din Pro (10% commission) pe shuru hota hai
        $user = (new User)->forceFill([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'username' => User::uniqueUsername($request->name),
        ] + PlanPricing::trialAttributes());
        $user->save();

        // referral jodo — galat/khud ka code chup-chaap ignore hota hai, signup kabhi fail nahi hota
        app(ReferralService::class)->attach($user, $request->input('ref') ?: $request->session()->pull('referral_code'));

        event(new Registered($user));

        Auth::login($user);
        DeviceTracker::recordLogin($user, $request, notify: false); // pehla device — "new sign-in" email ka matlab nahi

        return redirect()->intended(route('dashboard', absolute: false));
    }
}
