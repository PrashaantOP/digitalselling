<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Order;
use App\Support\Csv;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PaymentTransactionController extends Controller
{
    use RespondsFlexibly;

    private const TYPE_LABELS = [
        'course' => 'Course', 'event' => 'Event', 'book' => 'Book', 'locked_content' => 'Locked Content',
        'payment_page' => 'Payment Page', 'booking' => 'Booking',
    ];

    private const STATUS_LABELS = ['success' => 'Paid', 'pending' => 'Pending', 'failed' => 'Failed', 'refunded' => 'Refunded'];

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
            // BOM — bina iske Excel UTF-8 naam (₹, Hindi) ko garble kar deta hai
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Order No', 'Created', 'Paid At', 'Product', 'Type', 'Buyer', 'Email', 'Phone', 'Amount', 'Platform Fee', 'Net Payout', 'Status', 'Payment ID']);

            $this->query($request)->reorder()->orderBy('id')->chunk(500, function ($rows) use ($out) {
                foreach ($rows as $o) {
                    // buyer ka naam/email public se aata hai — formula injection se bachao
                    fputcsv($out, Csv::row([
                        $o->order_number, $o->created_at?->format('Y-m-d H:i'), $o->paid_at?->format('Y-m-d H:i'),
                        $o->product?->title ?? 'Deleted product', self::TYPE_LABELS[$o->product?->type] ?? $o->product?->type,
                        $o->buyer_name, $o->buyer_email, $o->buyer_phone,
                        $o->total_amount, $o->platform_fee, $o->net_payout_amount,
                        self::STATUS_LABELS[$o->status] ?? $o->status, $o->gateway_payment_id,
                    ]));
                }
            });
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * Buyer ke liye printable invoice — naye tab me khulta hai, browser ke "Save as PDF" se download.
     * Sirf paid orders ka, aur sirf apne tenant ka (dusre creator ka uuid ho to 404).
     */
    public function invoice(Request $request, Order $order)
    {
        // binding (routes/bindings.php) tenant ke andar uuid se order laati hai
        abort_unless(in_array($order->status, ['success', 'refunded'], true), 404);
        $order->load(['product:id,title,type', 'addonItems.addonProduct:id,title', 'coupon:id,code', 'creator.payoutProfile', 'creator.kycVerification']);

        $creator = $order->creator;
        $profile = $creator->payoutProfile;
        $kyc = $creator->kycVerification;

        return response()->view('invoices.order', [
            'order' => $order,
            'seller' => [
                'name' => $profile?->business_name ?: ($profile?->full_name ?: ($kyc?->legal_name ?: $creator->name)),
                'legal_name' => $kyc?->status === 'verified' ? $kyc->legal_name : null,
                'email' => $profile?->email ?: $creator->email,
                'phone' => $creator->phone,
                'gstin' => $kyc?->status === 'verified' ? $kyc->gst_number : null,
            ],
            'typeLabel' => self::TYPE_LABELS[$order->product?->type] ?? null,
            'autoPrint' => $request->boolean('print'),
        ]);
    }
}
