<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\StoreLinkClick;
use App\Models\StorePageView;
use App\Models\Visitor;
use App\Support\StorefrontCatalog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class StoreAnalyticsController extends Controller
{
    public function index(Request $request)
    {
        $days = in_array((int) $request->query('days'), [7, 30, 90], true) ? (int) $request->query('days') : 7;
        $since = now()->subDays($days)->startOfDay();

        $store = StoreController::storeFor(\App\Support\Tenant::id());

        $views = StorePageView::where('store_id', $store->id)->where('viewed_at', '>=', $since);

        $daily = (clone $views)
            ->selectRaw('DATE(viewed_at) as day, COUNT(*) as views, COUNT(DISTINCT visitor_id) as visitors')
            ->groupBy('day')->orderBy('day')->get();

        $orders = Order::where('creator_id', $store->user_id)->where('status', 'success')->where('paid_at', '>=', $since);

        return Inertia::render('Store/Edit', [
            'tab' => 'analytics',
            'store' => $store->load(['appearance', 'socialLinks', 'headerButtons']),
            'products' => StorefrontCatalog::for($store->user),
            'analytics' => [
                'days' => $days,
                'totals' => [
                    'page_views' => (clone $views)->count(),
                    'unique_visitors' => (clone $views)->distinct()->count('visitor_id'),
                    'sales' => (clone $orders)->count(),
                    'revenue' => (float) (clone $orders)->sum('net_payout_amount'),
                ],
                'daily' => $daily,
                'top_pages' => (clone $views)->select('page_path', DB::raw('COUNT(*) as views'))
                    ->groupBy('page_path')->orderByDesc('views')->limit(10)->get(),
                'top_referrers' => (clone $views)->whereNotNull('referrer')->where('referrer', '!=', '')
                    ->select('referrer', DB::raw('COUNT(*) as views'))->groupBy('referrer')->orderByDesc('views')->limit(10)->get(),
                'top_clicks' => StoreLinkClick::where('store_id', $store->id)->where('clicked_at', '>=', $since)
                    ->select('element_label', DB::raw('COUNT(*) as clicks'))->groupBy('element_label')->orderByDesc('clicks')->limit(10)->get(),
                'devices' => Visitor::where('store_id', $store->id)->where('last_seen_at', '>=', $since)
                    ->select('device', DB::raw('COUNT(*) as total'))->groupBy('device')->get(),
            ],
        ]);
    }
}
