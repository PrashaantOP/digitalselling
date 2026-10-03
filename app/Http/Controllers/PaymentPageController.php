<?php

namespace App\Http\Controllers;

use App\Models\PaymentPageDetail;
use App\Models\Product;
use Illuminate\Http\Request;

/** Payment page: ek simple checkout page — description, "what's included", FAQs aur buyer-info toggles. */
class PaymentPageController extends BaseProductController
{
    protected function type(): string { return 'payment_page'; }
    protected function param(): string { return 'paymentPage'; }
    protected function view(): string { return 'PaymentPages'; }
    protected function routeName(): string { return 'payment-pages'; }
    protected function detailModel(): ?string { return PaymentPageDetail::class; }
    protected function detailRelation(): ?string { return 'paymentPageDetail'; }

    /** Course/Event/Book/LockedContent ki tarah dashboard URLs me id ki jagah uuid (secure, guess nahi hoga). */
    protected function productDefaults(): array
    {
        return ['button_text' => 'Get it now', 'post_purchase_message' => 'Payment received. Thank you!'];
    }

    protected function detailDefaults(): array
    {
        return ['collect_full_name' => true, 'collect_note' => false];
    }

    protected function detailRules(Product $product): array
    {
        return [
            'subtitle' => ['nullable', 'string', 'max:150'],
            'whats_included' => ['nullable', 'array', 'max:20'],
            'whats_included.*' => ['nullable', 'string', 'max:150'],
            // file links jo pay ke baad buyer ko milte hain (Drive / Dropbox / koi bhi https link)
            'delivery_files' => ['nullable', 'array', 'max:' . PaymentPageDetail::MAX_FILES],
            'delivery_files.*.label' => ['nullable', 'string', 'max:120'],
            'delivery_files.*.url' => ['nullable', 'string', 'max:2000', 'url:http,https'],
            'faqs' => ['nullable', 'array', 'max:20'],
            'faqs.*.question' => ['nullable', 'string', 'max:200'],
            'faqs.*.answer' => ['nullable', 'string', 'max:1000'],
            'collect_full_name' => ['sometimes', 'boolean'],
            'collect_note' => ['sometimes', 'boolean'],
        ];
    }

    /** Editor adhoore (khali) points/FAQs bhi bhej deta hai jab creator type kar raha ho — DB me sirf bhare hue jaate hain. */
    protected function saveDetail(Product $product, array $detailData, Request $request): void
    {
        if (array_key_exists('whats_included', $detailData)) {
            $points = collect($detailData['whats_included'] ?? [])->map(fn ($p) => trim((string) $p))->filter()->values();
            $detailData['whats_included'] = $points->isEmpty() ? null : $points->all();
        }

        // link ke bina row (creator abhi type kar raha hai) save nahi hoti
        if (array_key_exists('delivery_files', $detailData)) {
            $files = collect($detailData['delivery_files'] ?? [])
                ->map(fn ($f) => ['label' => trim((string) ($f['label'] ?? '')), 'url' => trim((string) ($f['url'] ?? ''))])
                ->filter(fn ($f) => $f['url'] !== '')
                ->map(fn ($f) => ['label' => $f['label'] !== '' ? $f['label'] : null, 'url' => $f['url']])
                ->values();
            $detailData['delivery_files'] = $files->isEmpty() ? null : $files->all();
        }

        if (array_key_exists('faqs', $detailData)) {
            $faqs = collect($detailData['faqs'] ?? [])
                ->map(fn ($f) => ['question' => trim((string) ($f['question'] ?? '')), 'answer' => trim((string) ($f['answer'] ?? ''))])
                ->filter(fn ($f) => $f['question'] !== '')
                ->values();
            $detailData['faqs'] = $faqs->isEmpty() ? null : $faqs->all();
        }

        parent::saveDetail($product, $detailData, $request);
    }
}
