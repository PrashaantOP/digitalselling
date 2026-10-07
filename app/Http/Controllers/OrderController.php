<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Services\OrderService;
use App\Services\RazorpayService;
use App\Support\CheckoutSession;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

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

        // Payment pages ke creator "Full name" collect karna optional rakh sakte hain — baaki sab types me hamesha required hai.
        $nameOptedOut = $checkoutProduct->type === 'payment_page' && $checkoutProduct->paymentPageDetail?->collect_full_name === false;

        // State sirf course checkout pe dikhta hai — creator ne Show + Required on kiya ho to server pe bhi maango
        $stateQuestion = $checkoutProduct->type === 'course'
            ? $checkoutProduct->checkoutQuestions()->where('is_enabled', true)->get()->first->isState()
            : null;
        $stateRequired = (bool) $stateQuestion?->is_required;

        $data = $request->validate([
            'name' => [$nameOptedOut ? 'nullable' : 'required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150'],
            'phone' => ['required', 'string', 'regex:/^\+?[0-9]{8,15}$/'],
            'gstin' => ['nullable', 'string', 'max:20'],
            'state' => [$stateRequired ? 'required' : 'nullable', 'string', 'max:60', ...($stateQuestion ? [Rule::in(BaseProductController::INDIAN_STATES)] : [])],
            'note' => ['nullable', 'string', 'max:500'],
            'coupon_code' => ['nullable', 'string', 'max:30'],
            'amount' => [$checkoutProduct->pricing_type === 'customer_decides' ? 'required' : 'nullable', 'numeric', 'min:1', 'max:1000000'],
            'addons' => ['nullable', 'array'],
            'addons.*' => ['integer'],
            'answers' => ['nullable', 'array'],
        ]);

        $order = $orders->createPending($checkoutProduct->load('creator'), [
            'name' => $data['name'] ?? null, 'email' => $data['email'], 'phone' => $data['phone'],
            'gstin' => $data['gstin'] ?? null, 'state' => $data['state'] ?? null, 'note' => $data['note'] ?? null,
        ], [
            'coupon_code' => $data['coupon_code'] ?? null,
            'amount' => $data['amount'] ?? null,
            'addons' => $data['addons'] ?? [],
            'answers' => $data['answers'] ?? [],
        ]);

        // done page sirf isi browser me khulta hai jisne order banaya
        CheckoutSession::remember($order, (bool) $order->customer->buyer?->wasRecentlyCreated);

        return response()->json($orders->initiatePayment($order), 201);
    }

    /** POST /checkout/{checkoutProduct}/quote — coupon / add-on / amount badalne par live total. Kuch save nahi hota. */
    public function quote(Request $request, Product $checkoutProduct, OrderService $orders)
    {
        $data = $request->validate([
            'coupon_code' => ['nullable', 'string', 'max:30'],
            'amount' => ['nullable', 'numeric', 'min:1', 'max:1000000'],
            'addons' => ['nullable', 'array'],
            'addons.*' => ['integer'],
        ]);

        // pay-what-you-want me amount abhi khaali ho sakta hai — tab minimum pe hisaab dikhao
        if ($checkoutProduct->pricing_type === 'customer_decides' && empty($data['amount'])) {
            $data['amount'] = OrderService::minimumAmount($checkoutProduct);
        }

        $quote = $orders->quote($checkoutProduct, $data);

        return response()->json([
            'base' => $quote['base'],
            'discount' => $quote['discount'],
            'addons' => $quote['addons'],
            'total' => $quote['total'],
            'coupon' => $quote['coupon']?->only(['code', 'discount_percent']),
        ]);
    }

    /**
     * POST /checkout/verify — Razorpay Checkout.js ka success handler. Signature sahi ho tabhi access milta hai.
     * Browser band ho jaye to webhook (RazorpayWebhookController → ProcessSuccessfulOrder) yahi kaam kar deta hai.
     */
    public function verify(Request $request, OrderService $orders, RazorpayService $razorpay)
    {
        $data = $request->validate([
            'razorpay_order_id' => ['required', 'string', 'max:100'],
            'razorpay_payment_id' => ['required', 'string', 'max:100'],
            'razorpay_signature' => ['required', 'string', 'max:200'],
        ]);

        $order = Order::where('gateway_order_id', $data['razorpay_order_id'])->firstOrFail();

        if (! $razorpay->validPaymentSignature($data['razorpay_order_id'], $data['razorpay_payment_id'], $data['razorpay_signature'])) {
            throw ValidationException::withMessages(['payment' => 'We could not verify this payment. If money was deducted, your access will be emailed to you in a few minutes.']);
        }

        // signature sahi — phir bhi Razorpay se pucho: isi order ki, poori rakam ki, aur pakki (captured) hai?
        try {
            $state = $razorpay->confirmPayment($data['razorpay_payment_id'], $order->gateway_order_id, (int) round((float) $order->total_amount * 100));
        } catch (\Illuminate\Http\Client\RequestException|\Illuminate\Http\Client\ConnectionException $e) {
            report($e);
            // Razorpay se baat nahi hui — webhook thodi der me access de dega
            throw ValidationException::withMessages(['payment' => 'We are confirming your payment. If money was deducted, your access will be emailed to you in a few minutes.']);
        }

        if ($state === 'mismatch') {
            report(new \RuntimeException("Razorpay payment {$data['razorpay_payment_id']} does not match order {$order->order_number}"));

            throw ValidationException::withMessages(['payment' => 'We could not verify this payment. Please contact support with your order details.']);
        }

        if ($state !== 'captured') {
            throw ValidationException::withMessages(['payment' => 'The payment has not completed yet. If money was deducted, your access will be emailed to you in a few minutes.']);
        }

        $order = $orders->fulfil($order, $data['razorpay_payment_id']);

        if ($order->status === 'refunded') {
            // der se aayi session payment — slot chala gaya, paisa wapas
            throw ValidationException::withMessages(['payment' => 'Sorry — that time slot was booked by someone else while you were paying. Your money has been refunded.']);
        }

        return response()->json(['paid' => true, 'redirect' => url("/checkout/done/{$order->uuid}")]);
    }
}
