<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\StorePageView;
use Inertia\Inertia;

class DashboardController extends Controller
{
    use RespondsFlexibly;

    public function index()
    {
        $creator = auth()->user();
        $tid = $this->tid();
        $since = now()->startOfWeek();

        $paid = Order::where('creator_id', $tid)->where('status', 'success')->where('paid_at', '>=', $since);
        $store = Store::where('user_id', $tid)->first();

        $stats = [
            'visits' => $store ? StorePageView::where('store_id', $store->id)->where('viewed_at', '>=', $since)->count() : 0,
            'sales' => (clone $paid)->count(),
            'revenue' => (float) (clone $paid)->sum('net_payout_amount'),
        ];

        $owner = $creator->isSubAdmin() ? $creator->parentCreator : $creator;
        $checklist = [
            'store_profile' => (bool) ($store?->bio && $store?->avatar),
            'first_product' => Product::where('creator_id', $tid)->exists(),
            'payout_method' => $owner->payoutMethods()->exists(),
            'kyc' => $owner->kycVerification?->status === 'verified',
        ];

        return Inertia::render('Dashboard/Index', [
            'stats' => $stats,
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
}
