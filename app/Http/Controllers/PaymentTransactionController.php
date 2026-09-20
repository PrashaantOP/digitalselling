<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PaymentTransactionController extends Controller
{
    use RespondsFlexibly;

    private function query(Request $request): Builder
    {
        return Order::query()
            ->with('product:id,title,type')
            ->where('creator_id', $this->tid())
            ->when($request->query('status'), fn ($q, $v) => $q->where('status', $v))
            ->when($request->query('type'), fn ($q, $v) => $q->whereHas('product', fn ($p) => $p->where('type', $v)))
            ->when($request->query('from'), fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($request->query('to'), fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->when($request->query('search'), fn ($q, $v) => $q->where(fn ($s) => $s
                ->where('order_number', 'like', "%{$v}%")
                ->orWhere('buyer_name', 'like', "%{$v}%")
                ->orWhere('buyer_email', 'like', "%{$v}%")
                ->orWhere('buyer_phone', 'like', "%{$v}%")))
            ->latest();
    }

    public function index(Request $request)
    {
        $summary = (clone $this->query($request))->where('status', 'success')
            ->selectRaw('COUNT(*) as orders, COALESCE(SUM(total_amount),0) as gross, COALESCE(SUM(platform_fee),0) as fees, COALESCE(SUM(net_payout_amount),0) as net')
            ->reorder()->setEagerLoads([])->first();

        return Inertia::render('Payments/Index', [
            'transactions' => $this->query($request)->paginate(20)->withQueryString(),
            'summary' => $summary,
            'filters' => $request->only(['status', 'type', 'from', 'to', 'search']),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $filename = 'transactions-' . now()->format('Ymd-His') . '.csv';

        return response()->streamDownload(function () use ($request) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Order No', 'Date', 'Product', 'Type', 'Buyer', 'Email', 'Phone', 'Amount', 'Fee', 'Net', 'Status']);

            $this->query($request)->reorder()->orderBy('id')->chunk(500, function ($rows) use ($out) {
                foreach ($rows as $o) {
                    fputcsv($out, [
                        $o->order_number, $o->created_at?->format('Y-m-d H:i'), $o->product?->title, $o->product?->type,
                        $o->buyer_name, $o->buyer_email, $o->buyer_phone,
                        $o->total_amount, $o->platform_fee, $o->net_payout_amount, $o->status,
                    ]);
                }
            });
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }
}
