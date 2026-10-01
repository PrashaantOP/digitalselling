<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BillingInvoice;
use App\Models\PlanPurchase;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/** Admin → Billing: creators ne Pro ke liye jo pay kiya (plan_purchases) aur uske tax invoices. Read-only. */
class BillingController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(['paid', 'pending', 'failed', 'refunded', 'all'])],
            'q' => ['nullable', 'string', 'max:100'],
        ]);
        $status = $filters['status'] ?? 'paid';

        $items = PlanPurchase::query()
            ->with(['user:id,uuid,name,email', 'invoice:id,uuid,plan_purchase_id,invoice_number'])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($filters['q'] ?? null, fn ($q, $v) => $q->where(fn ($s) => $s
                ->where('gateway_payment_id', 'like', "%{$v}%")->orWhere('gateway_order_id', 'like', "%{$v}%")
                ->orWhereHas('invoice', fn ($i) => $i->where('invoice_number', 'like', "%{$v}%"))
                ->orWhereHas('user', fn ($u) => $u->where('email', 'like', "%{$v}%")->orWhere('name', 'like', "%{$v}%"))))
            ->latest('id')
            ->paginate(25)->withQueryString()
            ->through(fn (PlanPurchase $p) => [
                'uuid' => $p->uuid,
                'status' => $p->status,
                'months' => $p->months,
                'amount' => (float) $p->amount_payable,
                'credit' => (float) $p->credit_applied,
                'gateway' => $p->gateway,
                'payment_id' => $p->gateway_payment_id,
                'paid_at' => $p->paid_at?->toIso8601String(),
                'created_at' => $p->created_at?->toIso8601String(),
                'period_end' => $p->period_end?->toIso8601String(),
                'failure_reason' => $p->failure_reason,
                'creator' => $p->user?->only(['uuid', 'name', 'email']),
                'invoice' => $p->invoice?->only(['uuid', 'invoice_number']),
            ]);

        // is mahine (IST) ka hisaab — invoices se, kyunki GST wahi rows hain
        $monthStart = now('Asia/Kolkata')->startOfMonth()->setTimezone(config('app.timezone'));
        $month = BillingInvoice::where('status', 'paid')->where('paid_at', '>=', $monthStart);

        return Inertia::render('Admin/Billing/Index', [
            'items' => $items,
            'filters' => ['status' => $status, 'q' => $filters['q'] ?? null],
            'totals' => [
                'month_revenue' => (float) (clone $month)->sum('amount'),
                'month_taxable' => (float) (clone $month)->sum('taxable_amount'),
                'month_gst' => (float) (clone $month)->sum('cgst_amount') + (float) (clone $month)->sum('sgst_amount') + (float) (clone $month)->sum('igst_amount'),
                'active_pro' => User::where('role', 'creator')->where('plan', 'pro')
                    ->where(fn ($q) => $q->whereNull('plan_expires_at')->orWhere('plan_expires_at', '>', now()))->count(),
            ],
        ]);
    }

    public function invoice(Request $request, BillingInvoice $adminInvoice)
    {
        return response()->view('invoices.plan', [
            'invoice' => $adminInvoice->load('purchase'),
            'autoPrint' => $request->boolean('print'),
        ]);
    }
}
