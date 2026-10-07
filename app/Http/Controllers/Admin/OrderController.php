<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\RefundService;
use App\Support\AdminAudit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/** Poore platform ke orders — support ke liye search + read-only detail. */
class OrderController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['pending', 'success', 'failed', 'refunded'])],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $orders = Order::query()
            ->with(['product:id,title,type', 'creator:id,uuid,name,username'])
            ->when($filters['q'] ?? null, fn ($q, $v) => $q->where(fn ($s) => $s
                ->where('order_number', 'like', "%{$v}%")
                ->orWhere('buyer_email', 'like', "%{$v}%")->orWhere('buyer_phone', 'like', "%{$v}%")->orWhere('buyer_name', 'like', "%{$v}%")
                ->orWhere('gateway_payment_id', 'like', "%{$v}%")
                ->orWhereHas('creator', fn ($c) => $c->where('email', 'like', "%{$v}%")->orWhere('username', 'like', "%{$v}%"))))
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($filters['from'] ?? null, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($filters['to'] ?? null, fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->latest()
            ->paginate(25)->withQueryString()
            ->through(fn (Order $o) => [
                'uuid' => $o->uuid,
                'order_number' => $o->order_number,
                'status' => $o->status,
                'total_amount' => (float) $o->total_amount,
                'platform_fee' => (float) $o->platform_fee,
                'buyer' => $o->buyer_name ?: ($o->buyer_email ?: $o->buyer_phone),
                'product' => $o->product?->title,
                'creator' => $o->creator?->only(['uuid', 'name', 'username']),
                'created_at' => $o->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Admin/Orders/Index', ['orders' => $orders, 'filters' => $filters]);
    }

    public function show(Order $adminOrder)
    {
        $o = $adminOrder->load(['product:id,title,type', 'creator:id,uuid,name,email,username', 'coupon:id,code', 'settlement:id,uuid,number,status', 'addonItems.addonProduct:id,title', 'checkoutAnswers.question:id,label']);

        return Inertia::render('Admin/Orders/Show', [
            'order' => $o->only(['uuid', 'order_number', 'status', 'buyer_name', 'buyer_email', 'buyer_phone', 'buyer_state', 'buyer_gstin', 'buyer_note', 'payment_gateway', 'gateway_order_id', 'gateway_payment_id', 'refund_id', 'refund_status', 'refund_reason'])
                + [
                    'base_amount' => (float) $o->base_amount,
                    'discount_amount' => (float) $o->discount_amount,
                    'addon_amount' => (float) $o->addon_amount,
                    'total_amount' => (float) $o->total_amount,
                    'commission_rate' => (float) $o->commission_rate,
                    'platform_fee' => (float) $o->platform_fee,
                    'net_payout_amount' => (float) $o->net_payout_amount,
                    'created_at' => $o->created_at?->toIso8601String(),
                    'paid_at' => $o->paid_at?->toIso8601String(),
                    'refunded_at' => $o->refunded_at?->toIso8601String(),
                    'product' => $o->product?->only(['title', 'type']),
                    'creator' => $o->creator?->only(['uuid', 'name', 'email', 'username']),
                    'coupon' => $o->coupon?->code,
                    'settlement' => $o->settlement?->only(['uuid', 'number', 'status']),
                    'addons' => $o->addonItems->map(fn ($a) => ['title' => $a->addonProduct?->title, 'price' => (float) $a->price]),
                    'answers' => $o->checkoutAnswers->map(fn ($a) => ['question' => $a->question?->label, 'answer' => $a->answer]),
                ],
        ]);
    }

    /** Poora refund — Razorpay pe paisa wapas, access band, creator ki kamai / settlement theek (RefundService). */
    public function refund(Request $request, Order $adminOrder, RefundService $refunds): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);
        abort_unless($adminOrder->status === 'success', 422, 'Only paid orders can be refunded.');

        $refunds->refund($adminOrder, $data['reason'], $request->user('admin'));
        AdminAudit::log('order.refunded', $adminOrder, ['amount' => (float) $adminOrder->total_amount, 'reason' => $data['reason']]);

        return back()->with('status', "{$adminOrder->order_number} refunded — the buyer gets the money back in 5–7 working days.");
    }
}
