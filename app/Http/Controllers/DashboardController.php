<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\StorePageView;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\SettlementService;
use App\Support\PlanPricing;
use App\Support\TeamAccess;
use App\Support\TeamSeats;
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

        // sub-admin ko paise / orders sirf payments.view pe — warna numbers zero (data kabhi browser tak nahi jaata)
        $canSeeSales = TeamAccess::can($creator, 'payments.view');
        $moneyKeys = ['revenue', 'sales', 'conversion', 'aov'];

        $stats = [];
        foreach ($current as $key => $value) {
            $hidden = ! $canSeeSales && in_array($key, $moneyKeys, true);
            $stats[$key] = $hidden
                ? ['value' => 0, 'previous' => 0, 'change' => null]
                : ['value' => $value, 'previous' => $previous[$key], 'change' => $this->change($value, $previous[$key])];
        }

        $owner = $creator->isSubAdmin() ? $creator->parentCreator : $creator;
        $checklist = [
            'store_profile' => (bool) ($store?->bio && $store?->avatar),
            'first_product' => Product::where('creator_id', $tid)->exists(),
            'payout_method' => $owner->payoutMethods()->exists(),
            'kyc' => $owner->kycVerification?->status === 'verified',
        ];

        // sub-admin ko balance tabhi dikhe jab payouts.view mila ho
        $canSeePayouts = TeamAccess::can($creator, 'payouts.view');

        $paid = fn () => Order::where('orders.creator_id', $tid)->where('orders.status', 'success')->whereBetween('orders.paid_at', [$from, $to]);

        $chart = $this->dailySeries($paid(), $store?->id, $from, $to);
        if (! $canSeeSales) {
            $chart = array_map(fn ($row) => array_merge($row, array_intersect_key(['revenue' => 0, 'sales' => 0], $row)), $chart);
        }

        return Inertia::render('Dashboard/Index', [
            'days' => $days,
            'canSeeSales' => $canSeeSales,
            'stats' => $stats,
            'chart' => $chart,
            'revenueByType' => ! $canSeeSales ? [] : $paid()->join('products', 'products.id', '=', 'orders.product_id')
                ->select('products.type', DB::raw('SUM(orders.net_payout_amount) as revenue'), DB::raw('COUNT(*) as sales'))
                ->groupBy('products.type')->orderByDesc('revenue')->get()
                ->map(fn ($r) => ['type' => $r->type, 'revenue' => (float) $r->revenue, 'sales' => (int) $r->sales]),
            'topProducts' => ! $canSeeSales ? [] : $paid()->join('products', 'products.id', '=', 'orders.product_id')
                ->select('products.id', 'products.title', 'products.type', DB::raw('SUM(orders.net_payout_amount) as revenue'), DB::raw('COUNT(*) as sales'))
                ->groupBy('products.id', 'products.title', 'products.type')->orderByDesc('revenue')->limit(5)->get()
                ->map(fn ($r) => ['id' => $r->id, 'title' => $r->title, 'type' => $r->type, 'revenue' => (float) $r->revenue, 'sales' => (int) $r->sales]),
            'balance' => $canSeePayouts ? app(SettlementService::class)->balanceFor($owner) : null,
            'totals' => [
                'customers' => TeamAccess::can($creator, 'audience.view') ? Customer::where('creator_id', $tid)->count() : 0,
                'products' => Product::where('creator_id', $tid)->count(),
            ],
            'profileCompletion' => [
                'percent' => (int) round(count(array_filter($checklist)) / count($checklist) * 100),
                'items' => $checklist,
            ],
            // amount = creator ki kamai (net), baaki KPI jaisa. Browser ko uuid hi — numeric id nahi
            'recentOrders' => ! $canSeeSales ? [] : Order::with('product:id,title')
                ->where('creator_id', $tid)->where('status', 'success')
                ->latest('paid_at')->limit(5)
                ->get(['uuid', 'product_id', 'buyer_name', 'net_payout_amount', 'paid_at'])
                ->map(fn (Order $o) => [
                    'uuid' => $o->uuid,
                    'buyer_name' => $o->buyer_name,
                    'product' => $o->product?->title,
                    'amount' => (float) $o->net_payout_amount,
                    'paid_at' => $o->paid_at,
                ]),
            'plusOffer' => $creator->isSubAdmin() ? null : $this->plusOffer($owner, $tid),
        ]);
    }

    /**
     * Free creator ko Plus ka sach wala faayda (commission ka fark + pichhle 30 din me kitna bachta).
     * Plus user / plan na mile to null — card nahi dikhta.
     */
    private function plusOffer(User $owner, int $tid): ?array
    {
        if (PlanPricing::effectivePlan($owner) !== 'free') {
            return null;
        }

        $plus = SubscriptionPlan::where('slug', 'plus')->where('is_active', true)->first();
        if (! $plus) {
            return null;
        }

        $current = PlanPricing::commissionRate($owner);
        $plusRate = (float) $plus->commission_rate;
        $sales = (float) Order::where('creator_id', $tid)->where('status', 'success')
            ->where('paid_at', '>=', now()->subDays(30))->sum('total_amount');

        return [
            'current_rate' => $current,
            'plus_rate' => $plusRate,
            'monthly_price' => (float) $plus->monthly_price,
            'saved_last_30' => round(max(0, $current - $plusRate) / 100 * $sales, 2),
            'team_seats' => TeamSeats::LIMITS['plus'],
        ];
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
