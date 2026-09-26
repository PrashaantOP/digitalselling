<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\CourseLesson;
use App\Models\Enrollment;
use App\Models\Product;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Support\PlanPricing;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

/**
 * GET /                   — platform landing page (creators ke liye)
 * GET /products/{type}    — har product type ka detailed page
 * GET /privacy-policy…    — legal / company pages (footer links)
 */
class HomeController extends Controller
{
    // slug => Legal/Policy page key. Ye sab RESERVED_USERNAMES me bhi hone chahiye.
    public const PAGES = ['privacy-policy', 'terms', 'refund-policy', 'about', 'contact'];

    // URL slug => products.type (content frontend ke components/home/products.ts me hai)
    public const PRODUCT_PAGES = [
        'courses' => 'course',
        'events' => 'event',
        'ebooks' => 'book',
        'locked-content' => 'locked_content',
        'payment-pages' => 'payment_page',
        'one-on-one-sessions' => 'booking',
    ];

    public function index()
    {
        // Landing pe live numbers — 10 min cache, har visit pe count query nahi
        $stats = Cache::remember('home.stats', 600, fn () => [
            'creators' => User::where('role', 'creator')->whereNotNull('username')->count(),
            'products' => Product::where('status', 'published')->count(),
            'courses' => Product::where('status', 'published')->where('type', 'course')->count(),
            'lessons' => CourseLesson::where('is_published', true)->count(),
            'learners' => Enrollment::count(),
        ]);

        return Inertia::render('Home', ['stats' => $stats] + $this->pricing());
    }

    public function product(string $type)
    {
        return Inertia::render('Platform/Product', ['type' => self::PRODUCT_PAGES[$type]] + $this->pricing());
    }

    public function page(string $page)
    {
        return Inertia::render('Legal/Policy', ['page' => $page]);
    }

    private function pricing(): array
    {
        return [
            'plans' => SubscriptionPlan::where('is_active', true)->orderBy('monthly_price')
                ->get(['id', 'name', 'slug', 'monthly_price', 'commission_rate', 'features']),
            'trialDays' => PlanPricing::TRIAL_DAYS,
        ];
    }
}
