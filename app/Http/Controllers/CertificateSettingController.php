<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesUploads;
use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\CertificateSetting;
use App\Services\CertificateService;
use App\Support\Tenant;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Dashboard → Courses → Certificate design. Ek creator ka ek design, uske saare courses ke certificates pe.
 * Certificate creator ka hota hai — uska logo, colour, signature. Kuch set na kare to store ka avatar aur
 * brand colour lagta hai.
 */
class CertificateSettingController extends Controller
{
    use HandlesUploads, RespondsFlexibly;

    public function __construct(private CertificateService $certificates) {}

    public function edit()
    {
        $creator = Tenant::creator();
        $settings = $creator->certificateSetting;
        $design = $this->certificates->design($creator);

        return Inertia::render('Courses/Certificate', [
            'settings' => [
                'template' => $design['template'],
                // null = default chal raha hai (form me "store ka colour" dikhane ke liye)
                'accent_color' => $settings?->accent_color,
                'signatory_name' => $settings?->signatory_name,
                'signatory_title' => $settings?->signatory_title,
                'has_logo' => (bool) $settings?->logo_path,
                'has_signature' => (bool) $settings?->signature_path,
            ],
            'resolved' => $design,
            'templates' => collect(CertificateSetting::TEMPLATES)->map(fn ($label, $key) => ['key' => $key, 'label' => $label, 'orientation' => CertificateSetting::orientation($key)])->values(),
            'previewUrl' => url('/dashboard/courses/certificate/preview'),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'template' => ['required', Rule::in(array_keys(CertificateSetting::TEMPLATES))],
            'accent_color' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'signatory_name' => ['nullable', 'string', 'max:100'],
            'signatory_title' => ['nullable', 'string', 'max:100'],
            'logo' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
            'signature' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
            'remove_logo' => ['sometimes', 'boolean'],
            'remove_signature' => ['sometimes', 'boolean'],
        ]);

        $settings = CertificateSetting::firstOrNew(['user_id' => $this->tid()]);
        $settings->fill([
            'template' => $data['template'],
            'accent_color' => CertificateService::color($data['accent_color'] ?? null),
            'signatory_name' => $data['signatory_name'] ?? null,
            'signatory_title' => $data['signatory_title'] ?? null,
        ]);

        foreach (['logo' => 'logo_path', 'signature' => 'signature_path'] as $field => $column) {
            if ($request->hasFile($field)) {
                $this->deletePublic($settings->{$column});
                $settings->{$column} = $this->putPublic($request->file($field), 'certificate');
            } elseif (! empty($data["remove_{$field}"])) {
                $this->deletePublic($settings->{$column});
                $settings->{$column} = null;
            }
        }

        $settings->save();

        return $this->done($request, 'Certificate design saved.');
    }

    /**
     * Settings page ka live preview (iframe) — nakli student ke saath. Query me form ki abhi ki values aati hain,
     * taaki save se pehle hi template/colour ka asar dikhe. Kuch save nahi hota.
     */
    public function preview(Request $request)
    {
        $overrides = $request->validate([
            'template' => ['nullable', Rule::in(array_keys(CertificateSetting::TEMPLATES))],
            'accent_color' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'signatory_name' => ['nullable', 'string', 'max:100'],
            'signatory_title' => ['nullable', 'string', 'max:100'],
        ]);

        return response()->view('certificates.show', $this->certificates->sampleData(Tenant::creator(), array_filter($overrides, fn ($v) => $v !== null)) + ['embedded' => true]);
    }
}
