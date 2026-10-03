<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Settlement;
use App\Models\User;
use App\Services\SettlementService;
use App\Support\AdminAudit;
use App\Support\Csv;
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
                'adjustment_amount' => (float) $s->adjustment_amount,
            ],
            'adjustments' => $s->adjustments()->oldest('id')->get()->map(fn ($a) => [
                'uuid' => $a->uuid, 'type' => $a->type, 'amount' => (float) $a->amount, 'reason' => $a->reason,
            ]),
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

    /**
     * Bank ke bulk-transfer ke liye pending settlements ki CSV. Nikalte hi wo processing ho jaate hain,
     * taaki do admin ek hi batch do baar na bhej dein. UTR aane par bulkPaid() se band karo.
     */
    public function export()
    {
        $rows = Settlement::with(['creator:id,name,email', 'payoutMethod'])->where('status', 'pending')->oldest('id')->get();

        abort_if($rows->isEmpty(), 422, 'There are no pending settlements to export.');

        foreach ($rows as $settlement) {
            $this->settlements->markProcessing($settlement);
        }

        AdminAudit::log('settlements.exported', null, ['count' => $rows->count(), 'total' => (float) $rows->sum('net_amount')]);

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // BOM — Excel UTF-8 naam sahi dikhaye
            fputcsv($out, ['Settlement', 'Creator', 'Email', 'Mode', 'Beneficiary name', 'Account number', 'IFSC', 'UPI ID', 'Amount', 'UTR']);

            foreach ($rows as $s) {
                $m = $s->payoutMethod;
                // creator ka naam/UPI unka diya hua hai — formula injection se bachao
                fputcsv($out, Csv::row([
                    $s->number, $s->creator?->name, $s->creator?->email, $m?->type === 'upi' ? 'UPI' : 'Bank transfer',
                    $m?->account_holder_name ?: $s->creator?->name, $m?->account_number, $m?->ifsc, $m?->upi_id,
                    number_format((float) $s->net_amount, 2, '.', ''), '',
                ]));
            }

            fclose($out);
        }, 'settlements-' . now()->format('Ymd-His') . '.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * Wahi CSV, UTR column bhar ke wapas upload karo — har row jisme UTR hai paid ho jaati hai.
     * Sirf "Settlement" aur "UTR" columns padhe jaate hain; galat rows chhod kar report hoti hain.
     */
    public function bulkPaid(Request $request): RedirectResponse
    {
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt', 'max:1024']]);

        $handle = fopen($request->file('file')->getRealPath(), 'r');
        $header = array_map(fn ($h) => strtolower(trim((string) preg_replace('/^\xEF\xBB\xBF/', '', (string) $h))), fgetcsv($handle) ?: []);
        $numberCol = array_search('settlement', $header, true);
        $utrCol = array_search('utr', $header, true);

        if ($numberCol === false || $utrCol === false) {
            fclose($handle);

            return back()->withErrors(['file' => 'The file needs "Settlement" and "UTR" columns — use the exported file.']);
        }

        $paid = 0;
        $skipped = [];

        while (($row = fgetcsv($handle)) !== false) {
            $number = trim((string) ($row[$numberCol] ?? ''));
            $utr = ltrim(trim((string) ($row[$utrCol] ?? '')), "'");

            if ($number === '' || $utr === '') {
                continue; // UTR abhi nahi aaya — row waise hi rehne do
            }

            $settlement = Settlement::where('number', $number)->first();

            if (! $settlement || ! in_array($settlement->status, ['pending', 'processing'], true) || mb_strlen($utr) > 100) {
                $skipped[] = $number;

                continue;
            }

            $this->settlements->markPaid($settlement, $utr);
            $paid++;
        }

        fclose($handle);
        AdminAudit::log('settlements.bulk_paid', null, ['paid' => $paid, 'skipped' => $skipped]);

        return back()->with('status', "{$paid} settlement(s) marked paid." . ($skipped ? ' Skipped: ' . implode(', ', array_slice($skipped, 0, 10)) . (count($skipped) > 10 ? '…' : '') . '.' : ''));
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

    /**
     * Custom settlement ka page. `?creator={uuid}` na ho to un creators ki list jinke orders abhi kisi settlement
     * me nahi hain; ho to us creator ke saare unsettled orders + pending adjustments, chunne ke liye.
     */
    public function create(Request $request)
    {
        $creator = $request->query('creator')
            ? User::withTrashed()->where('role', 'creator')->where('uuid', $request->query('creator'))->with('kycVerification')->firstOrFail()
            : null;

        if (! $creator) {
            $creatorIds = Order::where('status', 'success')->whereNull('settlement_id')->whereNotNull('paid_at')->distinct()->pluck('creator_id');

            return Inertia::render('Admin/Settlements/Create', [
                // delete hue creator ka bacha paisa bhi haath se nikal sake
                'creators' => User::withTrashed()->whereIn('id', $creatorIds)->with('kycVerification')->orderBy('name')->get()->map(fn (User $c) => [
                    'creator' => $c->only(['uuid', 'name', 'email']),
                    'orders' => $this->settlements->unsettledOrders($c->id)->count(),
                    'net' => (float) $this->settlements->unsettledOrders($c->id)->sum('net_payout_amount'),
                    'blocked_reason' => $this->settlements->blockedReason($c),
                ])->values(),
                'selected' => null,
            ]);
        }

        $cutoff = SettlementService::cutoffDate();
        $method = $this->settlements->payoutMethodFor($creator);

        return Inertia::render('Admin/Settlements/Create', [
            'creators' => [],
            'selected' => [
                'creator' => $creator->only(['uuid', 'name', 'email']),
                'blocked_reason' => $this->settlements->blockedReason($creator),
                'payout' => $method ? ['type' => $method->type, 'destination' => $method->type === 'upi' ? $method->upi_id : "{$method->account_number} · {$method->ifsc}"] : null,
                'hold_days' => SettlementService::HOLD_DAYS,
                'min_hours' => SettlementService::CUSTOM_HOLD_HOURS,
                'orders' => $this->settlements->unsettledOrders($creator->id)->with('product:id,title')->oldest('paid_at')->get()
                    ->map(fn (Order $o) => [
                        'uuid' => $o->uuid, 'order_number' => $o->order_number, 'product' => $o->product?->title,
                        'buyer' => $o->buyer_name ?: $o->buyer_email, 'paid_at' => $o->paid_at?->toIso8601String(),
                        'total_amount' => (float) $o->total_amount, 'platform_fee' => (float) $o->platform_fee, 'net' => (float) $o->net_payout_amount,
                        // 24 ghante se naya — abhi chuna hi nahi ja sakta
                        'too_new' => $o->paid_at->gt(now()->subHours(SettlementService::CUSTOM_HOLD_HOURS)),
                        // cycle ka T+2 hold paar nahi hua — Razorpay ka paisa abhi aaya nahi hoga
                        'on_hold' => $o->paid_at->copy()->startOfDay()->gt($cutoff),
                    ]),
                'adjustments' => $this->settlements->pendingAdjustments($creator->id)->oldest('id')->get()->map(fn ($a) => [
                    'uuid' => $a->uuid, 'type' => $a->type, 'amount' => (float) $a->amount, 'reason' => $a->reason,
                ]),
            ],
        ]);
    }

    /** Admin ke chune hue orders ka settlement. Baaki orders agli cycle ke liye chhoot jaate hain. */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'creator' => ['required', 'uuid'],
            'orders' => ['required', 'array', 'min:1', 'max:1000'],
            'orders.*' => ['uuid', 'distinct'],
            'adjustments' => ['sometimes', 'array', 'max:200'],
            'adjustments.*' => ['uuid', 'distinct'],
        ]);

        $creator = User::withTrashed()->where('role', 'creator')->where('uuid', $data['creator'])->with('kycVerification')->firstOrFail();

        // uuid → id, sirf isi creator ke; jo na mile (kisi aur ka / settle ho chuka) wo count ke farq se pakda jaata hai
        $orderIds = $this->settlements->unsettledOrders($creator->id)->whereIn('uuid', $data['orders'])->pluck('id')->all();
        $adjustmentIds = $this->settlements->pendingAdjustments($creator->id)->whereIn('uuid', $data['adjustments'] ?? [])->pluck('id')->all();

        if (count($orderIds) !== count($data['orders']) || count($adjustmentIds) !== count($data['adjustments'] ?? [])) {
            return back()->withErrors(['orders' => 'Some of the selected items were just settled elsewhere. Reload and pick again.']);
        }

        $settlement = $this->settlements->settleCustom($creator, $orderIds, $adjustmentIds);
        AdminAudit::log('settlement.created_custom', $settlement, ['orders' => $settlement->orders_count, 'amount' => (float) $settlement->net_amount]);

        return redirect("/admin/settlements/{$settlement->uuid}")->with('status', "{$settlement->number} created for {$settlement->orders_count} order(s).");
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
