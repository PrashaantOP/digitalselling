<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\StorePageView;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    use RespondsFlexibly;

    public function index(Request $request)
    {
        $creator = $request->user();
        $tid = $this->tid();
        $days = in_array((int) $request->query('days'), [7, 30, 90], true) ? (int) $request->query('days') : 30;

        // current window = aaj samet pichhle $days din; previous = usse just pehle ke utne hi din
        $to = CarbonImmutable::now()->endOfDay();
        $from = $to->subDays($days - 1)->startOfDay();
        $prevTo = $from->subSecond();
        $prevFrom = $from->subDays($days);

        $store = Store::where('user_id', $tid)->first();

        $current = $this->periodStats($tid, $store?->id, $from, $to);
        $previous = $this->periodStats($tid, $store?->id, $prevFrom, $prevTo);

        $stats = [];
        foreach ($current as $key => $value) {
            $stats[$key] = ['value' => $value, 'previous' => $previous[$key], 'change' => $this->change($value, $previous[$key])];
        }

        $owner = $creator->isSubAdmin() ? $creator->parentCreator : $creator;
        $checklist = [
            'store_profile' => (bool) ($store?->bio && $store?->avatar),
            'first_product' => Product::where('creator_id', $tid)->exists(),
            'payout_method' => $owner->payoutMethods()->exists(),
            'kyc' => $owner->kycVerification?->status === 'verified',
        ];

        // sub-admin ko balance tabhi dikhe jab payouts.view mila ho (CheckPermission jaisa hi rule)
        $canSeePayouts = ! $creator->isSubAdmin() || $creator->getAllPermissions()->pluck('name')->contains('payouts.view');

        $paid = fn () => Order::where('orders.creator_id', $tid)->where('orders.status', 'success')->whereBetween('orders.paid_at', [$from, $to]);

        return Inertia::render('Dashboard/Index', [
            'days' => $days,
            'stats' => $stats,
            'chart' => $this->dailySeries($paid(), $store?->id, $from, $to),
            'revenueByType' => $paid()->join('products', 'products.id', '=', 'orders.product_id')
                ->select('products.type', DB::raw('SUM(orders.net_payout_amount) as revenue'), DB::raw('COUNT(*) as sales'))
                ->groupBy('products.type')->orderByDesc('revenue')->get()
                ->map(fn ($r) => ['type' => $r->type, 'revenue' => (float) $r->revenue, 'sales' => (int) $r->sales]),
            'topProducts' => $paid()->join('products', 'products.id', '=', 'orders.product_id')
                ->select('products.id', 'products.title', 'products.type', DB::raw('SUM(orders.net_payout_amount) as revenue'), DB::raw('COUNT(*) as sales'))
                ->groupBy('products.id', 'products.title', 'products.type')->orderByDesc('revenue')->limit(5)->get()
                ->map(fn ($r) => ['id' => $r->id, 'title' => $r->title, 'type' => $r->type, 'revenue' => (float) $r->revenue, 'sales' => (int) $r->sales]),
            'balance' => $canSeePayouts ? PayoutController::balance($owner->id) : null,
            'totals' => [
                'customers' => Customer::where('creator_id', $tid)->count(),
                'products' => Product::where('creator_id', $tid)->count(),
            ],
            'profileCompletion' => [
                'percent' => (int) round(count(array_filter($checklist)) / count($checklist) * 100),
                'items' => $checklist,
            ],
            'recentOrders' => Order::with('product:id,title,type')
                ->where('creator_id', $tid)->where('status', 'success')
                ->latest('paid_at')->limit(8)
                ->get(['id', 'order_number', 'product_id', 'buyer_name', 'total_amount', 'paid_at']),
        ]);
    }

    /** ek window ke KPIs — current aur previous dono isi se nikalte hain taaki comparison apples-to-apples ho */
    private function periodStats(int $tid, ?int $storeId, CarbonImmutable $from, CarbonImmutable $to): array
    {
        $paid = Order::where('creator_id', $tid)->where('status', 'success')->whereBetween('paid_at', [$from, $to]);
        $revenue = (float) (clone $paid)->sum('net_payout_amount');
        $sales = (clone $paid)->count();

        $views = $storeId ? StorePageView::where('store_id', $storeId)->whereBetween('viewed_at', [$from, $to]) : null;
        $visits = $views ? (clone $views)->count() : 0;
        $visitors = $views ? (clone $views)->distinct()->count('visitor_id') : 0;

        return [
            'revenue' => round($revenue, 2),
            'sales' => $sales,
            'visits' => $visits,
            'visitors' => $visitors,
            'conversion' => $visitors > 0 ? round($sales / $visitors * 100, 2) : 0.0,
            'aov' => $sales > 0 ? round($revenue / $sales, 2) : 0.0,
        ];
    }

    /** har din ki ek row — jis din kuch nahi hua wahan 0 bhar dete hain taaki graph me gap na aaye */
    private function dailySeries($paid, ?int $storeId, CarbonImmutable $from, CarbonImmutable $to): array
    {
        $orders = $paid->selectRaw('DATE(orders.paid_at) as day, SUM(orders.net_payout_amount) as revenue, COUNT(*) as sales')
            ->groupBy('day')->get()->keyBy('day');

        $views = $storeId
            ? StorePageView::where('store_id', $storeId)->whereBetween('viewed_at', [$from, $to])
                ->selectRaw('DATE(viewed_at) as day, COUNT(*) as visits')->groupBy('day')->pluck('visits', 'day')
            : collect();

        return collect(CarbonPeriod::create($from, '1 day', $to->startOfDay()))->map(function ($date) use ($orders, $views) {
            $day = $date->toDateString();

            return [
                'day' => $day,
                'revenue' => round((float) ($orders[$day]->revenue ?? 0), 2),
                'sales' => (int) ($orders[$day]->sales ?? 0),
                'visits' => (int) ($views[$day] ?? 0),
            ];
        })->values()->all();
    }

    private function change(float|int $current, float|int $previous): ?float
    {
        return $previous > 0 ? round(($current - $previous) / $previous * 100, 1) : null;
    }
}
