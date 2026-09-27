<?php

namespace App\Mail;

use App\Support\DeviceTracker;
use Illuminate\Bus\Queueable;
use Illuminate\Http\Request;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

/**
 * Account ki koi security setting badli — user ko turant pata chale, taaki "ye maine nahi kiya" ho to
 * wo jaldi react kare. Ek hi mail class, event ke hisaab se text.
 */
class SecurityNoticeMail extends Mailable
{
    use Queueable, SerializesModels;

    public const EVENTS = [
        'password_changed' => ['Your password was changed', 'The password for your account was just changed.'],
        'email_changed' => ['Your account email was changed', 'The email address on your account was just changed to :detail. Sign-in links and alerts now go there.'],
        'two_factor_disabled' => ['Two-step verification was turned off', 'Two-step verification was just turned off for your account.'],
        'two_factor_reset' => ['Two-step verification was reset by support', 'Our support team turned off two-step verification on your account after verifying your identity. You can turn it on again from Security settings.'],
        'sessions_revoked' => ['You were signed out of other devices', 'All other devices were just signed out of your account.'],
        'payout_method_changed' => ['Your payout account was changed', 'The payout account where your earnings are sent was just changed (:detail). Settlements pause until it is verified again.'],
        'kyc_submitted' => ['KYC details submitted', 'New KYC details (PAN and bank account) were just submitted for your store.'],
    ];

    public function __construct(
        public string $event,
        public string $name,
        public ?string $detail,
        public ?string $ip,
        public string $userAgent,
    ) {}

    /** Bhejo aur bhool jao — mail fail hone se asli action fail nahi hona chahiye. */
    public static function deliver(string $to, string $event, ?string $name, Request $request, ?string $detail = null): void
    {
        try {
            Mail::to($to)->send(new self($event, $name ?? '', $detail, $request->ip(), (string) $request->userAgent()));
        } catch (\Throwable $e) {
            report($e);
        }
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: self::EVENTS[$this->event][0] ?? 'Security alert for your account');
    }

    public function content(): Content
    {
        $message = self::EVENTS[$this->event][1] ?? 'A security setting on your account was changed.';

        return new Content(markdown: 'mail.security-notice', with: [
            'headline' => self::EVENTS[$this->event][0] ?? 'Security alert',
            'body' => str_replace(':detail', (string) $this->detail, $message),
            'device' => DeviceTracker::describe($this->userAgent),
            'when' => now()->setTimezone('Asia/Kolkata')->format('j M Y, g:i a') . ' IST',
            'passwordUrl' => url('/forgot-password'),
        ]);
    }
}
