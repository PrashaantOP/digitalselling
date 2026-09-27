<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\KycVerification;
use App\Models\Order;
use App\Models\PayoutMethod;
use App\Models\Settlement;
use App\Models\User;
use Inertia\Inertia;

/** Platform ka ek nazar me hisaab + jo kaam admin ka intezaar kar rahe hain (queues). */
class DashboardController extends Controller
{
    public function __invoke()
    {
        $creators = fn () => User::where('role', 'creator');
        $paid = fn () => Order::where('status', 'success');
        $monthStart = now()->startOfMonth();

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'creators_total' => $creators()->count(),
                'creators_active' => $creators()->where('status', 'active')->count(),
                'creators_suspended' => $creators()->where('status', 'suspended')->count(),
                'creators_new_this_month' => $creators()->where('created_at', '>=', $monthStart)->count(),
                'gmv' => (float) $paid()->sum('total_amount'),
                'gmv_this_month' => (float) $paid()->where('paid_at', '>=', $monthStart)->sum('total_amount'),
                'commission' => (float) $paid()->sum('platform_fee'),
                'commission_this_month' => (float) $paid()->where('paid_at', '>=', $monthStart)->sum('platform_fee'),
                'orders' => $paid()->count(),
            ],
            'queues' => [
                'kyc_pending' => KycVerification::where('status', 'pending')->count(),
                'payout_unverified' => PayoutMethod::whereNull('verified_at')->count(),
                'settlements_pending' => Settlement::whereIn('status', ['pending', 'processing'])->count(),
                'settlements_pending_amount' => (float) Settlement::whereIn('status', ['pending', 'processing'])->sum('net_amount'),
            ],
        ]);
    }
}
