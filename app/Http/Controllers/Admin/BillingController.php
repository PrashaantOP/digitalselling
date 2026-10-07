<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BillingInvoice;
use App\Models\PlanPurchase;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Admin → Billing (read-only): Pro auto-renew subscriptions (har mahine ka charge + failures), purani prepaid
 * kharid (plan_purchases) aur sabke tax invoices.
 */
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

        // auto-renew — failure wale sabse upar, phir chalu, phir history. Alag page param, purchases ke saath na takraye
        $subscriptions = Subscription::query()
            ->with(['user:id,uuid,name,email,plan_expires_at'])
            ->withCount('invoices')
            ->whereNotIn('status', ['created', 'abandoned'])
            ->when($filters['q'] ?? null, fn ($q, $v) => $q->where(fn ($s) => $s
                ->where('gateway_subscription_id', 'like', "%{$v}%")
                ->orWhereHas('user', fn ($u) => $u->where('email', 'like', "%{$v}%")->orWhere('name', 'like', "%{$v}%"))))
            ->orderByRaw("FIELD(status, 'authenticated', 'active', 'pending', 'halted') DESC")
            ->latest('id')
            ->paginate(10, ['*'], 'subs_page')->withQueryString()
            ->through(fn (Subscription $s) => [
                'uuid' => $s->uuid,
                'status' => $s->status,
                'renews' => $s->renews(),
                'gateway_id' => $s->gateway_subscription_id,
                'charges' => $s->invoices_count,
                'last_charged_at' => $s->last_charged_at?->toIso8601String(),
                'next_charge_at' => $s->renews() ? ($s->status === 'authenticated' ? $s->user?->plan_expires_at : $s->current_period_end)?->toIso8601String() : null,
                'cancelled_at' => $s->cancelled_at?->toIso8601String(),
                'failure_reason' => $s->failure_reason,
                'creator' => $s->user?->only(['uuid', 'name', 'email']),
            ]);

        // is mahine (IST) ka hisaab — invoices se, kyunki GST wahi rows hain
        $monthStart = now('Asia/Kolkata')->startOfMonth()->setTimezone(config('app.timezone'));
        $month = BillingInvoice::where('status', 'paid')->where('paid_at', '>=', $monthStart);

        return Inertia::render('Admin/Billing/Index', [
            'items' => $items,
            'subscriptions' => $subscriptions,
            'filters' => ['status' => $status, 'q' => $filters['q'] ?? null],
            'totals' => [
                'month_revenue' => (float) (clone $month)->sum('amount'),
                'month_taxable' => (float) (clone $month)->sum('taxable_amount'),
                'month_gst' => (float) (clone $month)->sum('cgst_amount') + (float) (clone $month)->sum('sgst_amount') + (float) (clone $month)->sum('igst_amount'),
                'active_pro' => User::where('role', 'creator')->where('plan', 'pro')
                    ->where(fn ($q) => $q->whereNull('plan_expires_at')->orWhere('plan_expires_at', '>', now()))->count(),
                'renewing' => Subscription::whereIn('status', ['authenticated', 'active', 'pending'])->where('cancel_at_period_end', false)->count(),
                'failing' => Subscription::whereIn('status', ['pending', 'halted'])->count(),
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
