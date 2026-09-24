<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Public product/checkout page (guest). Sirf safe fields expose hote hain —
 * private file paths, hidden content, join links yahan kabhi nahi jaate.
 */
abstract class BaseProductCheckoutController extends Controller
{
    abstract protected function type(): string;

    /** Inertia page: Public/{view} */
    abstract protected function view(): string;

    /** Type-specific public data (safe fields only) */
    protected function extra(Product $product): array
    {
        return [];
    }

    protected function relations(): array
    {
        return [];
    }

    public function show(Request $request, string $slug)
    {
        $product = Product::with(array_merge([
            'creator:id,name,username,avatar',
            'coverImages',
            'checkoutQuestions',
            'addons.addonProduct:id,title,type,pricing_type,price,has_discount,discounted_price,status',
        ], $this->relations()))
            ->where('slug', $slug)->where('type', $this->type())->where('status', 'published')
            ->firstOrFail();

        $product->increment('views_count');

        return Inertia::render('Public/' . $this->view(), [
            'product' => $product->only([
                'id',
                'type',
                'title',
                'slug',
                'description',
                'cover_type',
                'cover_video_url',
                'pricing_type',
                'price',
                'has_discount',
                'discounted_price',
                'button_text',
                'theme',
                'accent_color',
                'terms_and_conditions',
                'refund_policy',
                'privacy_policy',
                'fb_pixel_id',
                'ga_tracking_id',
            ]) + [
                'cover_images' => $product->coverImages->sortBy('sort_order')->pluck('image_path')->values(),
                'checkout_questions' => $product->checkoutQuestions->where('is_enabled', true)->sortBy('sort_order')->values()->map->only(['id', 'label', 'field_type', 'options', 'is_required', 'is_enabled']),
                'addons' => $product->addons->pluck('addonProduct')->filter(fn($p) => $p && $p->status === 'published')->values()
                    ->map->only(['id', 'title', 'type', 'pricing_type', 'price', 'has_discount', 'discounted_price']),
            ] + $this->extra($product),
            'creator' => $product->creator->only(['name', 'username', 'avatar']),
            'checkoutUrl' => url("/checkout/{$product->id}/order"),
        ]);
    }
}
