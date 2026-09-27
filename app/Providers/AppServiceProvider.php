<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register / reset / password change sab yahi rule use karte hain (Rules\Password::defaults()).
        // uncompromised() haveibeenpwned API ko call karta hai — sirf production me.
        Password::defaults(fn () => Password::min(10)
            ->letters()
            ->mixedCase()
            ->numbers()
            ->when($this->app->isProduction(), fn (Password $rule) => $rule->uncompromised()));

        // Email+IP wala 5-try lock LoginRequest me hai; ye ek IP se alag-alag emails try karne ko rokta hai.
        RateLimiter::for('login-ip', fn (Request $request) => Limit::perMinute(20)->by($request->ip()));
        // ek IP se ghante me 5 naye accounts — bulk fake signups / verification-email spam rokne ke liye
        RateLimiter::for('register', fn (Request $request) => Limit::perHour(5)->by($request->ip()));

        if ($this->app->isProduction() && config('app.debug')) {
            logger()->critical('APP_DEBUG is enabled in production — stack traces and env values can leak. Set APP_DEBUG=false.');
        }

        // log/array mailer pe login OTP aur reset links log file me likh jaate hain — production me kabhi nahi
        if ($this->app->isProduction() && in_array(config('mail.default'), ['log', 'array'], true)) {
            logger()->critical('MAIL_MAILER is "' . config('mail.default') . '" in production — sign-in codes and reset links are being written to logs instead of emailed.');
        }
    }
}
