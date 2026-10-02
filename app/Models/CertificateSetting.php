<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Creator ka certificate design (template, logo, signature, colour). Khaali field = default
 * (store ka avatar / brand colour / creator ka naam) — CertificateService::design() resolve karta hai.
 */
class CertificateSetting extends Model
{
    protected $table = 'certificate_settings';

    public const TEMPLATES = [
        'classic' => 'Classic',
        'modern' => 'Modern',
        'minimal' => 'Minimal',
        'ribbon' => 'Ribbon',
        'portrait' => 'Classic portrait',
        'portrait_modern' => 'Modern portrait',
    ];

    /** Ye templates khade (A4 portrait) page pe bante hain; baaki sab A4 landscape. */
    public const PORTRAIT = ['portrait', 'portrait_modern'];

    public static function orientation(string $template): string
    {
        return in_array($template, self::PORTRAIT, true) ? 'portrait' : 'landscape';
    }

    protected $fillable = [
        'user_id',
        'template',
        'logo_path',
        'signature_path',
        'signatory_name',
        'signatory_title',
        'accent_color',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
