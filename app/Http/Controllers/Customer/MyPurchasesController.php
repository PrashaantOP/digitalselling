<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Inertia\Inertia;

/** Orders / invoices / book downloads / unlocked content. */
class MyPurchasesController extends Controller
{
    use ResolvesCustomer;

    public function index()
    {
        $orders = Order::with(['product:id,title,type,slug', 'addonItems.addonProduct:id,title,type', 'lockedContentUnlocks.lockedContent'])
            ->whereIn('customer_id', $this->customerIds())->where('status', 'success')
            ->latest('paid_at')->get()
            ->map(function (Order $o) {
                $items = collect([$o->product])->merge($o->addonItems->pluck('addonProduct'))->filter();

                return $o->only(['id', 'order_number', 'total_amount', 'paid_at', 'buyer_name']) + [
                    'items' => $items->map(fn ($p) => $p->only(['id', 'title', 'type']) + [
                        'download_url' => $p->type === 'book' ? url("/me/books/{$p->id}/download") : null,
                    ])->values(),
                    // locked content unlock hone ke baad hidden cheezein yahin dikhti hain
                    'unlocked' => $o->lockedContentUnlocks->map(fn ($u) => [
                        'title' => $o->product->title,
                        'hidden_message' => $u->lockedContent?->hidden_message,
                        'hidden_video_url' => $u->lockedContent?->hidden_video_url,
                    ]),
                ];
            });

        return Inertia::render('Customer/MyPurchases', ['orders' => $orders]);
    }
}
