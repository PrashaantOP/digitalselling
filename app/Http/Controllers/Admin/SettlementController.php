<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Settlement;
use App\Models\User;
use App\Services\SettlementService;
use App\Support\AdminAudit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SettlementController extends Controller
{
    public function __construct(private SettlementService $settlements) {}

    public function index(Request $request)
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(['pending', 'processing', 'paid', 'failed', 'all'])],
            'q' => ['nullable', 'string', 'max:100'],
        ]);
        $status = $filters['status'] ?? 'pending';

        $items = Settlement::query()
            ->with(['creator:id,uuid,name,email', 'payoutMethod:id,type,upi_id,account_number,ifsc'])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($filters['q'] ?? null, fn ($q, $v) => $q->where(fn ($s) => $s
                ->where('number', 'like', "%{$v}%")->orWhere('reference_number', 'like', "%{$v}%")
                ->orWhereHas('creator', fn ($c) => $c->where('email', 'like', "%{$v}%")->orWhere('name', 'like', "%{$v}%"))))
            ->when($status === 'pending', fn ($q) => $q->oldest('id'), fn ($q) => $q->latest('id'))
            ->paginate(25)->withQueryString()
            ->through(fn (Settlement $s) => $this->row($s));

        return Inertia::render('Admin/Settlements/Index', [
            'items' => $items,
            'filters' => ['status' => $status, 'q' => $filters['q'] ?? null],
            'pendingTotal' => (float) Settlement::whereIn('status', ['pending', 'processing'])->sum('net_amount'),
        ]);
    }

    public function show(Settlement $adminSettlement)
    {
        $s = $adminSettlement->load(['creator:id,uuid,name,email', 'payoutMethod']);

        return Inertia::render('Admin/Settlements/Show', [
            'settlement' => $this->row($s) + [
                'gross_amount' => (float) $s->gross_amount,
                'commission_amount' => (float) $s->commission_amount,
                'period_start' => $s->period_start?->toIso8601String(),
                'period_end' => $s->period_end?->toIso8601String(),
                'failure_reason' => $s->failure_reason,
                'notes' => $s->notes,
                'processed_at' => $s->processed_at?->toIso8601String(),
                'payout_holder' => $s->payoutMethod?->account_holder_name,
            ],
            'orders' => $s->orders()->with('product:id,title')->oldest('paid_at')->get()
                ->map(fn (Order $o) => [
                    'uuid' => $o->uuid, 'order_number' => $o->order_number, 'product' => $o->product?->title,
                    'buyer' => $o->buyer_name ?: $o->buyer_email, 'paid_at' => $o->paid_at?->toIso8601String(),
                    'total_amount' => (float) $o->total_amount, 'platform_fee' => (float) $o->platform_fee, 'net' => (float) $o->net_payout_amount,
                ]),
        ]);
    }

    public function markPaid(Request $request, Settlement $adminSettlement): RedirectResponse
    {
        $data = $request->validate([
            'reference' => ['required', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);
        abort_unless(in_array($adminSettlement->status, ['pending', 'processing'], true), 422, 'Only pending settlements can be marked paid.');

        $this->settlements->markPaid($adminSettlement, $data['reference'], $data['notes'] ?? null);
        AdminAudit::log('settlement.marked_paid', $adminSettlement, ['reference' => $data['reference'], 'amount' => (float) $adminSettlement->net_amount]);

        return back()->with('status', "{$adminSettlement->number} marked as paid.");
    }

    /** Fail pe uske orders free ho jaate hain aur agli cycle me dobara aayenge (SettlementService). */
    public function markFailed(Request $request, Settlement $adminSettlement): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);
        abort_unless(in_array($adminSettlement->status, ['pending', 'processing'], true), 422, 'Only pending settlements can be marked failed.');

        $this->settlements->markFailed($adminSettlement, $data['reason']);
        AdminAudit::log('settlement.marked_failed', $adminSettlement, ['reason' => $data['reason']]);

        return back()->with('status', "{$adminSettlement->number} marked as failed — its orders go back into the next cycle.");
    }

    /** Cycle chalane se pehle dekh lo kiske kitne orders settle honge / kaun blocked hai. */
    public function preview()
    {
        $creatorIds = Order::where('status', 'success')->whereNull('settlement_id')->whereNotNull('paid_at')
            ->whereDate('paid_at', '<=', SettlementService::cutoffDate()->toDateString())
            ->distinct()->pluck('creator_id');

        $rows = User::whereIn('id', $creatorIds)->with('kycVerification')->get()->map(function (User $c) {
            $eligible = $this->settlements->eligibleOrders($c->id);

            return [
                'creator' => $c->only(['uuid', 'name', 'email']),
                'orders' => (clone $eligible)->count(),
                'net' => (float) (clone $eligible)->sum('net_payout_amount'),
                'blocked_reason' => $this->settlements->blockedReason($c),
            ];
        })->values();

        return response()->json(['cutoff' => SettlementService::cutoffDate()->toDateString(), 'rows' => $rows]);
    }

    public function run(): RedirectResponse
    {
        $result = $this->settlements->runAll();
        AdminAudit::log('settlements.run', null, $result);

        return back()->with('status', "{$result['settlements']} settlement(s) created for {$result['orders']} order(s); {$result['blocked']} creator(s) blocked.");
    }

    private function row(Settlement $s): array
    {
        $m = $s->payoutMethod;

        return [
            'uuid' => $s->uuid,
            'number' => $s->number,
            'status' => $s->status,
            'orders_count' => $s->orders_count,
            'net_amount' => (float) $s->net_amount,
            'reference_number' => $s->reference_number,
            'created_at' => $s->created_at?->toIso8601String(),
            'creator' => $s->creator?->only(['uuid', 'name', 'email']),
            'payout' => $m ? ['type' => $m->type, 'destination' => $m->type === 'upi' ? $m->upi_id : "{$m->account_number} · {$m->ifsc}"] : null,
        ];
    }
}
