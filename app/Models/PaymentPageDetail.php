<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentPageDetail extends Model
{
    use HasFactory;

    protected $table = 'payment_page_details';

    /** Ek page pe zyada se zyada itne file links. */
    public const MAX_FILES = 50;

    protected $fillable = [
        'product_id',
        'subtitle',
        'whats_included',
        'delivery_files',
        'faqs',
        'collect_full_name',
        'collect_note',
    ];

    protected $casts = [
        'whats_included' => 'array',
        'delivery_files' => 'array',
        'faqs' => 'array',
        'collect_full_name' => 'boolean',
        'collect_note' => 'boolean',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /**
     * Buyer ko milne wali files — sirf paid order ke baad (email, checkout done page, My purchases).
     * Public page pe kabhi nahi jaati.
     *
     * @return array<int, array{label: string, url: string}>
     */
    public function deliveryFiles(): array
    {
        return collect($this->delivery_files ?? [])
            ->filter(fn ($f) => is_array($f) && filled($f['url'] ?? null))
            ->values()
            ->map(fn ($f, $i) => ['label' => trim((string) ($f['label'] ?? '')) ?: 'File ' . ($i + 1), 'url' => (string) $f['url']])
            ->all();
    }
}
