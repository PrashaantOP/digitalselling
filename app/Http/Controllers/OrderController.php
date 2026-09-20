<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Services\OrderService;
use Illuminate\Http\Request;

/**
 * POST /checkout/{checkoutProduct}/order  (axios JSON)
 * Pending order + Razorpay order banata hai. Payment success hone pe asli kaam webhook + ProcessSuccessfulOrder job karta hai.
 * NOTE: booking products yahan se nahi, /book/{username}/{service} se order karte hain (slot chahiye).
 */
class OrderController extends Controller
{
    public function store(Request $request, Product $checkoutProduct, OrderService $orders)
    {
        abort_if($checkoutProduct->type === 'booking', 422, 'Use the booking page to book a session.');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150'],
            'phone' => ['required', 'string', 'regex:/^\+?[0-9]{8,15}$/'],
            'gstin' => ['nullable', 'string', 'max:20'],
            'state' => ['nullable', 'string', 'max:60'],
            'coupon_code' => ['nullable', 'string', 'max:30'],
            'amount' => [$checkoutProduct->pricing_type === 'customer_decides' ? 'required' : 'nullable', 'numeric', 'min:1', 'max:1000000'],
            'addons' => ['nullable', 'array'],
            'addons.*' => ['integer'],
            'answers' => ['nullable', 'array'],
        ]);

        // TODO (Auth module): phone OTP verified hai ya nahi yahan check karna — abhi OTP flow baad me hai.

        $order = $orders->createPending($checkoutProduct->load('creator'), [
            'name' => $data['name'], 'email' => $data['email'], 'phone' => $data['phone'],
            'gstin' => $data['gstin'] ?? null, 'state' => $data['state'] ?? null,
        ], [
            'coupon_code' => $data['coupon_code'] ?? null,
            'amount' => $data['amount'] ?? null,
            'addons' => $data['addons'] ?? [],
            'answers' => $data['answers'] ?? [],
        ]);

        return response()->json($orders->initiatePayment($order), 201);
    }
}
