<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductAddon;
use App\Services\OrderService;
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
            'addons' => fn ($q) => $q->orderBy('sort_order')->orderBy('id'),
            'addons.addonProduct:id,title,type,description,pricing_type,price,has_discount,discounted_price,status',
            // add-on ke "details" toggle ke liye: chhoti image + ek line (pages / lessons / date)
            'addons.addonProduct.coverImages:id,product_id,image_path,sort_order',
            'addons.addonProduct.bookDetail:id,product_id,format,pages',
            'addons.addonProduct.courseDetail:id,product_id,total_lessons,access_type,access_days',
            'addons.addonProduct.eventDetail:id,product_id,mode,starts_at',
        ], $this->relations()))
            ->where('slug', $slug)->where('type', $this->type())->where('status', 'published')
            // admin ne creator suspend kiya ho to uske product pages bhi band
            ->whereHas('creator', fn ($q) => $q->where('status', 'active'))
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
                // addon_price = buyer se jo liya jayega (creator ka offer, warna product ka daam); regular_price kata hua dikhane ke liye
                'addons' => $product->addons->filter(fn (ProductAddon $a) => $a->addonProduct?->status === 'published')->values()
                    ->map(fn (ProductAddon $a) => $a->addonProduct->only(['id', 'title', 'type', 'pricing_type', 'price', 'has_discount', 'discounted_price']) + [
                        'addon_price' => $a->effectivePrice(),
                        'regular_price' => OrderService::unitPrice($a->addonProduct),
                        'cover' => $a->addonProduct->coverImages->sortBy('sort_order')->first()?->image_path,
                        // sirf saada text, chhota — private cheezein (file, join link, hidden content) kabhi nahi
                        'summary' => str($a->addonProduct->description)->stripTags()->squish()->limit(140)->toString() ?: null,
                        'meta' => self::addonMeta($a->addonProduct),
                    ]),
            ] + $this->extra($product),
            'creator' => $product->creator->only(['name', 'username', 'avatar']),
            'checkoutUrl' => url("/checkout/{$product->uuid}/order"),
        ]);
    }

    /** Add-on ke details me ek line: "PDF · 120 pages" / "24 lessons · Lifetime access" / "Sat, 12 Oct · Online". */
    private static function addonMeta(Product $addon): ?string
    {
        $parts = match ($addon->type) {
            'book' => [
                $addon->bookDetail?->format ? strtoupper($addon->bookDetail->format) : null,
                $addon->bookDetail?->pages ? $addon->bookDetail->pages . ' pages' : null,
            ],
            'course' => [
                $addon->courseDetail?->total_lessons ? $addon->courseDetail->total_lessons . ' lessons' : null,
                $addon->courseDetail ? ($addon->courseDetail->access_type === 'days' ? $addon->courseDetail->access_days . ' days access' : 'Lifetime access') : null,
            ],
            'event' => [
                $addon->eventDetail?->starts_at?->copy()->setTimezone('Asia/Kolkata')->format('D, j M · g:i a'),
                $addon->eventDetail ? ($addon->eventDetail->mode === 'in_person' ? 'In person' : 'Online') : null,
            ],
            'locked_content' => ['Unlocks right after payment'],
            default => [],
        };

        return implode(' · ', array_filter($parts)) ?: null;
    }
}
