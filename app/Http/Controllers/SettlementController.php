<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Settlement;
use App\Services\SettlementService;
use App\Support\Tenant;
use Inertia\Inertia;

/**
 * Creator-facing settlements. Yahan koi "request payout" action nahi hai —
 * batches SettlementService/cycle banati hai; ye sirf paisa kahan hai wo dikhata hai.
 */
class SettlementController extends Controller
{
    use RespondsFlexibly;

    public function __construct(private SettlementService $settlements) {}

    public function index()
    {
        $owner = Tenant::creator();

        return Inertia::render('Settlements/Index', [
            'balance' => $this->settlements->balanceFor($owner),
            'settlements' => Settlement::with('payoutMethod')
                ->where('creator_id', $owner->id)->latest('id')->paginate(15),
            'methods' => $owner->payoutMethods()->get(),
            'kycStatus' => $owner->kycVerification?->status ?? 'not_started',
            'holdDays' => SettlementService::HOLD_DAYS,
            'nextRunAt' => SettlementService::nextRunAt(),
        ]);
    }

    /** "Ye settlement kin bookings ka hai aur kitna commission kata" — order-wise breakdown. */
    public function show(Settlement $settlement)
    {
        return Inertia::render('Settlements/Show', [
            'settlement' => $settlement->load('payoutMethod'),
            'orders' => $settlement->orders()
                ->with('product:id,title,type')
                ->oldest('paid_at')
                ->get([
                    'id', 'order_number', 'product_id', 'buyer_name', 'buyer_email', 'paid_at',
                    'total_amount', 'commission_rate', 'platform_fee', 'net_payout_amount',
                ]),
        ]);
    }
}
