<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Http\Controllers\PaymentTransactionController;
use App\Models\Enrollment;
use App\Models\EventRegistration;
use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Orders / invoices / book downloads / unlocked content / event tickets. */
class MyPurchasesController extends Controller
{
    use ResolvesCustomer;

    public function index()
    {
        $customerIds = $this->customerIds();

        $enrollments = Enrollment::whereIn('customer_id', $customerIds)->with('course:id,product_id')->get()->keyBy(fn ($e) => $e->course?->product_id);
        $registrations = EventRegistration::whereIn('customer_id', $customerIds)->with('event')->get()->keyBy(fn ($r) => $r->event?->product_id);

        $orders = Order::with([
            'product:id,uuid,title,type,slug,creator_id', 'product.creator' => fn ($q) => $q->withTrashed()->select('id', 'name', 'username'), 'product.paymentPageDetail',
            'addonItems.addonProduct:id,uuid,title,type', 'lockedContentUnlocks.lockedContent',
        ])
            ->whereIn('customer_id', $customerIds)->where('status', 'success')
            ->latest('paid_at')->orderByDesc('id')->get()
            ->map(function (Order $o) use ($enrollments, $registrations) {
                $items = collect([$o->product])->merge($o->addonItems->pluck('addonProduct'))->filter();

                return [
                    'uuid' => $o->uuid,
                    'order_number' => $o->order_number,
                    'total_amount' => (float) $o->total_amount,
                    'paid_at' => $o->paid_at,
                    'creator' => $o->product?->creator?->only(['name', 'username']),
                    'invoice_url' => url("/me/purchases/{$o->uuid}/invoice"),
                    'items' => $items->map(function ($p) use ($enrollments, $registrations) {
                        $event = $registrations->get($p->id)?->event;

                        return [
                            'title' => $p->title,
                            'type' => $p->type,
                            'download_url' => $p->type === 'book' ? url("/me/books/{$p->uuid}/download") : null,
                            // payment page ke "Files to deliver"
                            'files' => $p->type === 'payment_page' ? ($p->paymentPageDetail?->deliveryFiles() ?? []) : [],
                            'learn_url' => $p->type === 'course' && $enrollments->has($p->id) ? url("/me/courses/{$enrollments->get($p->id)->uuid}/learn") : null,
                            // event ka join link / pata sirf register hue buyer ko
                            'event' => $event ? [
                                'starts_at' => $event->starts_at, 'ends_at' => $event->ends_at, 'mode' => $event->mode,
                                'join_link' => $event->join_link, 'venue_address' => $event->venue_address,
                            ] : null,
                        ];
                    })->values(),
                    // locked content unlock hone ke baad hidden cheezein yahin dikhti hain
                    'unlocked' => $o->lockedContentUnlocks->map(fn ($u) => [
                        'title' => $o->product?->title,
                        'hidden_message' => $u->lockedContent?->hidden_message,
                        'hidden_video_url' => $u->lockedContent?->hidden_video_url,
                    ]),
                ];
            });

        return Inertia::render('Customer/MyPurchases', ['orders' => $orders]);
    }

    /** Buyer ka apna invoice — wahi printable view jo creator dashboard se khulta hai. */
    public function invoice(Request $request, string $orderUuid)
    {
        $order = Order::whereIn('customer_id', $this->customerIds())->where('uuid', $orderUuid)
            ->whereIn('status', ['success', 'refunded'])->firstOrFail();

        $order->load(['product:id,title,type', 'addonItems.addonProduct:id,title', 'coupon:id,code', 'creator.payoutProfile', 'creator.kycVerification']);

        return response()->view('invoices.order', [
            'order' => $order,
            'seller' => PaymentTransactionController::sellerFor($order),
            'typeLabel' => PaymentTransactionController::TYPE_LABELS[$order->product?->type] ?? null,
            'autoPrint' => $request->boolean('print'),
        ]);
    }
}
