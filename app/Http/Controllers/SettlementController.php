<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Settlement;
use App\Models\SettlementAdjustment;
use App\Services\SettlementService;
use App\Support\Csv;
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
            'orders' => $this->orders($settlement),
            'adjustments' => $this->adjustments($settlement),
        ]);
    }

    /** Printable statement (CA / bank reconciliation ke liye) — browser ke "Save as PDF" se download. */
    public function statement(Settlement $settlement)
    {
        $creator = Tenant::creator();

        return response()->view('invoices.settlement', [
            'settlement' => $settlement->load('payoutMethod'),
            'orders' => $this->orders($settlement),
            'adjustments' => $this->adjustments($settlement),
            'creatorName' => $creator->payoutProfile?->business_name ?: ($creator->payoutProfile?->full_name ?: $creator->name),
        ]);
    }

    /** Saare settlements ki CSV — accounts ke liye. */
    public function export()
    {
        $owner = Tenant::creator();

        return response()->streamDownload(function () use ($owner) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // BOM — Excel UTF-8 sahi padhe
            fputcsv($out, ['Settlement', 'Created', 'Status', 'Orders', 'Gross', 'Commission', 'Adjustments', 'Net', 'Paid on', 'Bank reference (UTR)']);

            Settlement::where('creator_id', $owner->id)->orderBy('id')->chunk(500, function ($rows) use ($out) {
                foreach ($rows as $s) {
                    fputcsv($out, Csv::row([
                        $s->number, $s->created_at?->format('Y-m-d'), ucfirst($s->status), $s->orders_count,
                        $s->gross_amount, $s->commission_amount, $s->adjustment_amount, $s->net_amount,
                        $s->status === 'paid' ? $s->processed_at?->format('Y-m-d') : '', $s->reference_number,
                    ]));
                }
            });

            fclose($out);
        }, 'settlements-' . now()->format('Ymd') . '.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function orders(Settlement $settlement)
    {
        return $settlement->orders()
            ->with('product:id,title,type')
            ->oldest('paid_at')
            ->get([
                'id', 'order_number', 'product_id', 'buyer_name', 'buyer_email', 'paid_at',
                'total_amount', 'commission_rate', 'platform_fee', 'net_payout_amount',
            ]);
    }

    private function adjustments(Settlement $settlement)
    {
        return $settlement->adjustments()->oldest('id')->get()->map(fn (SettlementAdjustment $a) => [
            'uuid' => $a->uuid,
            'label' => SettlementAdjustment::TYPE_LABELS[$a->type] ?? 'Adjustment',
            'amount' => (float) $a->amount,
            'reason' => $a->reason,
        ]);
    }
}
