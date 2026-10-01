<?php

namespace App\Services;

use App\Models\Certificate;
use App\Models\CertificateSetting;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Course certificate ka saara logic ek jagah: issue karna, dikhane ka data, design resolve karna,
 * naam sudhaarna aur radd karna.
 *
 * Certificate creator ka hota hai (uska logo, uska colour) — platform ka naam sirf neeche "Issued via".
 * Naam/course/creator issue ke waqt snapshot ho jaate hain; design live rehta hai.
 */
class CertificateService
{
    public const DEFAULT_ACCENT = '#4F46E5';

    /** Course poora hua — certificate do (pehle se ho to wahi). Snapshot yahin jamta hai. */
    public function issue(Enrollment $enrollment): Certificate
    {
        $enrollment->loadMissing(['customer.buyer', 'course.product:id,title,creator_id', 'course.product.creator:id,name']);

        return Certificate::firstOrCreate(
            ['enrollment_id' => $enrollment->id],
            [
                'certificate_number' => $this->newNumber(),
                'student_name' => $enrollment->customer?->buyer?->name ?: ($enrollment->customer?->name ?: 'Learner'),
                'course_title' => $enrollment->course->product->title,
                'creator_name' => $enrollment->course->product->creator->name,
                'issued_at' => now(),
            ],
        );
    }

    /** Blade (certificates.show) ke liye sab kuch. */
    public function viewData(Certificate $certificate): array
    {
        $certificate->loadMissing('enrollment.course.product.creator');
        $creator = $certificate->enrollment->course->product->creator;

        return [
            'studentName' => $certificate->student_name ?: 'Learner',
            'courseTitle' => $certificate->course_title ?: $certificate->enrollment->course->product->title,
            'creatorName' => $certificate->creator_name ?: $creator->name,
            'number' => $certificate->certificate_number,
            'issuedAt' => $certificate->issued_at,
            'verifyUrl' => self::verifyUrl($certificate->certificate_number),
            'revoked' => $certificate->isRevoked(),
            // signatory ka naam set na ho to issue ke waqt ka creator naam (snapshot), aaj ka nahi
            'design' => $this->design($creator, [], $certificate->creator_name),
            'sample' => false,
        ];
    }

    /**
     * Settings page ka live preview — nakli student ke saath, aur form ki abhi (save se pehle) ki values
     * $overrides me (template / accent_color / signatory_name / signatory_title).
     */
    public function sampleData(User $creator, array $overrides = []): array
    {
        return [
            'studentName' => 'Aarav Sharma',
            'courseTitle' => 'Your course title',
            'creatorName' => $creator->name,
            'number' => 'CERT-SAMPLE0001',
            'issuedAt' => now(),
            'verifyUrl' => self::verifyUrl('CERT-SAMPLE0001'),
            'revoked' => false,
            'design' => $this->design($creator, $overrides),
            'sample' => true,
        ];
    }

    /**
     * Creator ka design, defaults ke saath: logo → store ka avatar, colour → store ka brand colour,
     * signatory → creator ka naam / "Instructor".
     *
     * @return array{template: string, accent: string, logo: ?string, signature: ?string, signatory_name: string, signatory_title: string}
     */
    public function design(User $creator, array $overrides = [], ?string $fallbackName = null): array
    {
        $settings = $creator->certificateSetting;
        $store = $creator->store;

        $template = $overrides['template'] ?? $settings?->template ?? 'classic';
        $logo = $settings?->logo_path ?: $store?->avatar;

        // CSS me seedha jaata hai — sirf #RRGGBB hi
        $accent = self::color($overrides['accent_color'] ?? null)
            ?? self::color($settings?->accent_color)
            ?? self::color($store?->appearance?->brand_color)
            ?? self::DEFAULT_ACCENT;

        [$r, $g, $b] = sscanf($accent, '#%02x%02x%02x');

        return [
            'template' => array_key_exists($template, CertificateSetting::TEMPLATES) ? $template : 'classic',
            'accent' => $accent,
            // accent ke upar padhne layak text — halka colour ho to dark
            'accent_ink' => (0.299 * $r + 0.587 * $g + 0.114 * $b) > 160 ? '#14141B' : '#FFFFFF',
            'logo' => $logo ? url('/assets/' . $logo) : null,
            'signature' => $settings?->signature_path ? url('/assets/' . $settings->signature_path) : null,
            'signatory_name' => trim((string) ($overrides['signatory_name'] ?? $settings?->signatory_name)) ?: ($fallbackName ?: $creator->name),
            'signatory_title' => trim((string) ($overrides['signatory_title'] ?? $settings?->signatory_title)) ?: 'Instructor',
        ];
    }

    /** Creator ne spelling sudhaari — sirf naam, baaki snapshot waise hi. */
    public function rename(Certificate $certificate, string $name): Certificate
    {
        $certificate->update(['student_name' => trim($name)]);

        return $certificate;
    }

    /** Radd — row rehti hai (verify page pe "revoked" dikhna chahiye), delete nahi hoti. */
    public function revoke(Certificate $certificate, string $reason): Certificate
    {
        $certificate->update(['revoked_at' => now(), 'revoke_reason' => trim($reason)]);

        return $certificate;
    }

    public function restore(Certificate $certificate): Certificate
    {
        $certificate->update(['revoked_at' => null, 'revoke_reason' => null]);

        return $certificate;
    }

    public static function verifyUrl(string $number): string
    {
        return url('/certificates/' . $number);
    }

    /** "#RRGGBB" ho to wahi, warna null. */
    public static function color(?string $value): ?string
    {
        $value = trim((string) $value);

        return preg_match('/^#[0-9A-Fa-f]{6}$/', $value) ? strtoupper($value) : null;
    }

    private function newNumber(): string
    {
        do {
            $number = 'CERT-' . strtoupper(Str::random(10));
        } while (Certificate::where('certificate_number', $number)->exists());

        return $number;
    }
}
