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
        // SMS driver ek jagah se — tests isi binding ko fake se badal dete hain
        $this->app->bind(\App\Services\Sms\SmsSender::class, fn () => config('services.sms.driver') === 'msg91'
            ? new \App\Services\Sms\Msg91SmsSender
            : new \App\Services\Sms\LogSmsSender);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Referral ka ₹200 order success hote hi credit ho jaata hai (checkout pipeline jo bhi use set kare)
        \App\Models\Order::observe(\App\Observers\OrderObserver::class);

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

        // log driver pe mobile login ke codes log file me jaate hain — production me asli provider chahiye
        if ($this->app->isProduction() && config('services.sms.driver') === 'log') {
            logger()->critical('SMS_DRIVER is "log" in production — mobile sign-in codes are being written to logs instead of sent by SMS.');
        }

        if ($this->app->isProduction() && config('app.debug')) {
            logger()->critical('APP_DEBUG is enabled in production — stack traces and env values can leak. Set APP_DEBUG=false.');
        }

        // log/array mailer pe login OTP aur reset links log file me likh jaate hain — production me kabhi nahi
        if ($this->app->isProduction() && in_array(config('mail.default'), ['log', 'array'], true)) {
            logger()->critical('MAIL_MAILER is "' . config('mail.default') . '" in production — sign-in codes and reset links are being written to logs instead of emailed.');
        }
    }
}
