<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Product;
use App\Support\TeamAccess;
use App\Support\TeamPermissions;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Cross-type "My Products" catalog (Courses + Events + Books + Locked Content +
 * Payment Pages + Bookings in one table). Type-specific CRUD/builder pages
 * (CourseController, EventController, ...) are untouched — this is purely a
 * read-only browse/filter view that links out to each type's own edit page.
 */
class ProductsOverviewController extends Controller
{
    use RespondsFlexibly;

    private const EDIT_BASE = [
        'course' => 'courses',
        'event' => 'events',
        'book' => 'books',
        'locked_content' => 'locked-content',
        'payment_page' => 'payment-pages',
        'booking' => 'bookings/sessions',
    ];

    /** Sub-admin ko sirf wahi product types jinka {module}.view mila hai. */
    private function baseQuery()
    {
        $user = auth()->user();
        $types = collect(TeamPermissions::PRODUCT_TYPES)->filter(fn (string $module) => TeamAccess::can($user, "{$module}.view"))->keys();

        return Product::where('creator_id', $this->tid())->whereIn('type', $types);
    }

    public function index(Request $request)
    {
        $filters = $request->validate([
            'type' => ['nullable', Rule::in(array_keys(self::EDIT_BASE))],
            'status' => ['nullable', Rule::in(['published', 'draft', 'unpublished'])],
            'search' => ['nullable', 'string', 'max:100'],
        ]);
        $type = $filters['type'] ?? null;
        $status = $filters['status'] ?? null;
        $search = $filters['search'] ?? null;

        $canSeeSales = TeamAccess::can(auth()->user(), 'payments.view');

        $products = $this->baseQuery()
            ->with(['coverImages' => fn ($q) => $q->orderBy('sort_order')])
            ->when($type, fn ($q, $v) => $q->where('type', $v))
            ->when($status, fn ($q, $v) => $q->where('status', $v))
            ->when($search, fn ($q, $v) => $q->where('title', 'like', "%{$v}%"))
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(function (Product $p) use ($canSeeSales) {
                // URL me hamesha uuid — numeric id kabhi nahi
                $editUrl = '/dashboard/' . self::EDIT_BASE[$p->type] . "/{$p->uuid}/edit";
                $cover = $p->coverImages->first()?->image_path;

                return [
                    'id' => $p->id,
                    'uuid' => $p->uuid,
                    'title' => $p->title,
                    'type' => $p->type,
                    // image public/assets me hai — poora path do (pehle raw path jaata tha, thumbnail toot-ta tha)
                    'coverImage' => $cover ? (Str::startsWith($cover, ['http://', 'https://']) ? $cover : '/assets/' . ltrim($cover, '/')) : null,
                    'price' => (float) $p->price,
                    'discountedPrice' => $p->discounted_price !== null ? (float) $p->discounted_price : null,
                    'pricingType' => $p->pricing_type,
                    // bikri ke numbers sirf payments.view wale ko
                    'salesCount' => $canSeeSales ? $p->sales_count : null,
                    'revenueTotal' => $canSeeSales ? (float) $p->revenue_total : null,
                    'status' => $p->status,
                    'createdAt' => $p->created_at->format('M j, Y'),
                    'editUrl' => $editUrl,
                    // us type ka apna page (duplicate, delete, publish wahan)
                    'typeUrl' => '/dashboard/' . self::EDIT_BASE[$p->type],
                ];
            });

        $counts = (clone $this->baseQuery())
            ->selectRaw('type, COUNT(*) as c')
            ->groupBy('type')
            ->pluck('c', 'type');

        $byStatus = (clone $this->baseQuery())
            ->selectRaw('status, COUNT(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status');

        return Inertia::render('Products/Index', [
            'products' => $products,
            'counts' => [
                'all' => (int) $counts->sum(),
                'course' => (int) $counts->get('course', 0),
                'event' => (int) $counts->get('event', 0),
                'book' => (int) $counts->get('book', 0),
                'locked_content' => (int) $counts->get('locked_content', 0),
                'payment_page' => (int) $counts->get('payment_page', 0),
                'booking' => (int) $counts->get('booking', 0),
            ],
            'statusCounts' => [
                'published' => (int) $byStatus->get('published', 0),
                'draft' => (int) $byStatus->get('draft', 0),
                'unpublished' => (int) $byStatus->get('unpublished', 0),
            ],
            // upar ke tiles — bikri sirf payments.view wale ko
            'totals' => $canSeeSales ? [
                'revenue' => (float) (clone $this->baseQuery())->sum('revenue_total'),
                'sales' => (int) (clone $this->baseQuery())->sum('sales_count'),
            ] : null,
            // kaun se types ye user bana / dekh sakta hai (filter chips aur empty state ke liye)
            'types' => collect(TeamPermissions::PRODUCT_TYPES)->filter(fn (string $module) => TeamAccess::can(auth()->user(), "{$module}.view"))->keys()->values(),
            'filters' => ['type' => $type, 'status' => $status, 'search' => $search],
        ]);
    }
}
