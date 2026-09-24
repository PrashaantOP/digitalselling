<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Product;
use Illuminate\Http\Request;
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

    private function baseQuery()
    {
        return Product::where('creator_id', $this->tid());
    }

    public function index(Request $request)
    {
        $type = $request->query('type');
        $search = $request->query('search');

        $products = $this->baseQuery()
            ->when($type, fn ($q, $v) => $q->where('type', $v))
            ->when($search, fn ($q, $v) => $q->where('title', 'like', "%{$v}%"))
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(function (Product $p) {
                // course/event ki dashboard routes uuid pe bind hoti hain (bindings.php), id pe 404 aata hai
                $key = in_array($p->type, ['course', 'event'], true) ? $p->uuid : $p->id;
                $editUrl = '/dashboard/' . self::EDIT_BASE[$p->type] . "/{$key}/edit";

                return [
                    'id' => $p->id,
                    'title' => $p->title,
                    'type' => $p->type,
                    'coverImage' => $p->coverImages()->orderBy('sort_order')->value('image_path'),
                    'price' => (float) $p->price,
                    'pricingType' => $p->pricing_type,
                    'salesCount' => $p->sales_count,
                    'revenueTotal' => (float) $p->revenue_total,
                    'status' => $p->status,
                    'createdAt' => $p->created_at->format('M j, Y'),
                    'editUrl' => $editUrl,
                    // No separate analytics page yet per type — the builder's own
                    // "Analytics"/sales cards live on the same edit screen for now.
                    'analyticsUrl' => $editUrl,
                ];
            });

        $counts = (clone $this->baseQuery())
            ->selectRaw('type, COUNT(*) as c')
            ->groupBy('type')
            ->pluck('c', 'type');

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
            'filters' => ['type' => $type, 'search' => $search],
        ]);
    }
}
