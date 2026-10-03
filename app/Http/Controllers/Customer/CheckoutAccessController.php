<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Controller;
use App\Mail\OrderReceiptMail;
use App\Models\Buyer;
use App\Models\Order;
use App\Services\LoginOtpService;
use App\Services\OrderService;
use App\Support\CheckoutSession;
use App\Support\Phone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Pay ke turant baad wala page: /checkout/done/{orderUuid}. Sirf wahi browser khol sakta hai jisne order
 * banaya (CheckoutSession) — uuid kisi aur ke haath lage to use login page milta hai.
 *
 * Yahan se buyer ek code daal kar seedha apni cheez tak pahunchta hai. Bina code ke login NAHI hota:
 * warna koi kisi aur ka email likh kar (free product se bhi) uske account ka session le leta.
 */
class CheckoutAccessController extends Controller
{
    public function __construct(private LoginOtpService $otp, private OrderService $orders) {}

    public function show(Request $request, string $orderUuid)
    {
        $order = $this->order($orderUuid);

        if (! $order) {
            return redirect('/me/login');
        }

        $buyer = $order->customer?->buyer;
        $signedIn = $buyer && Auth::guard('customer')->id() === $buyer->id;

        return Inertia::render('Public/CheckoutDone', [
            'order' => [
                'uuid' => $order->uuid,
                'number' => $order->order_number,
                'status' => $order->status,
                'title' => $order->product?->title,
                'type' => $order->product?->type,
                'creator' => $order->product?->creator?->name,
                'total' => (float) $order->total_amount,
                'message' => $order->product?->post_purchase_message,
                // payment page ki files — sirf paid order pe (ye page waise bhi sirf kharidne wale browser ko khulta hai)
                'files' => $order->status === 'success' && $order->product?->type === 'payment_page'
                    ? ($order->product->paymentPageDetail?->deliveryFiles() ?? [])
                    : [],
            ],
            'contact' => $buyer ? [
                'email' => AdminAuthController::maskEmail($buyer->email),
                'phone' => $buyer->phone ? Phone::mask($buyer->phone) : null,
            ] : null,
            'channels' => $buyer ? $this->channels($order, $buyer) : [],
            'canFixEmail' => $buyer ? $this->canFixEmail($order, $buyer) : false,
            'openUrl' => $signedIn ? $this->orders->destination($order) : null,
            'status' => $request->session()->get('status'),
        ]);
    }

    /** POST …/code — chune hue channel pe OTP bhejo. */
    public function sendCode(Request $request, string $orderUuid): RedirectResponse
    {
        [$order, $buyer] = $this->paidOrder($orderUuid);
        $channel = $this->channel($request, $order, $buyer);

        try {
            if (! $this->otp->send($buyer, $this->purpose($channel), $request, $channel)) {
                throw ValidationException::withMessages(['code' => 'Please wait a minute before requesting another code.']);
            }
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);

            throw ValidationException::withMessages(['code' => $channel === 'sms'
                ? 'We could not send an SMS right now. Use the email code instead.'
                : 'We could not send the code right now. Please try again in a minute.']);
        }

        return back()->with('status', $channel === 'sms' ? 'Code sent by SMS.' : 'Code sent to your email.');
    }

    /** POST …/open — code sahi ho to login + seedha kharidi hui cheez. */
    public function open(Request $request, string $orderUuid): RedirectResponse
    {
        [$order, $buyer] = $this->paidOrder($orderUuid);
        $channel = $this->channel($request, $order, $buyer);
        $data = $request->validate(['code' => ['required', 'digits:6']]);

        $result = $this->otp->verify($buyer, $this->purpose($channel), $data['code']);

        if ($result !== LoginOtpService::OK) {
            throw ValidationException::withMessages(['code' => LoginOtpService::message($result)]);
        }

        return redirect(AuthController::signIn($request, $buyer, $channel, $this->orders->destination($order)));
    }

    /**
     * POST …/email — checkout pe email galat likh diya tha. Sirf tab jab account isi order ne banaya ho
     * aur abhi tak kisi ne use verify na kiya ho; kisi maujooda account ko yahan se chhua nahi jaata.
     */
    public function fixEmail(Request $request, string $orderUuid): RedirectResponse
    {
        [$order, $buyer] = $this->paidOrder($orderUuid);

        abort_unless($this->canFixEmail($order, $buyer), 403);

        $data = $request->validate(['email' => ['required', 'email', 'max:150']]);
        $email = Str::lower(trim($data['email']));

        if ($email !== $buyer->email) {
            if (Buyer::where('email', $email)->exists()) {
                throw ValidationException::withMessages(['email' => 'That email already has an account here. Sign in with it, or use the mobile code below to open this purchase.']);
            }

            DB::transaction(function () use ($buyer, $order, $email) {
                $buyer->forceFill(['email' => $email])->save();
                $buyer->customers()->update(['email' => $email]);
                Order::whereIn('customer_id', $buyer->customers()->pluck('id'))->update(['buyer_email' => $email]);
            });

            try {
                Mail::to($email)->send(new OrderReceiptMail($order->refresh()->load(['product.creator', 'addonItems.addonProduct'])));
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return back()->with('status', 'Email updated. Request a new code to continue.');
    }

    // ------------------------------------------------------------------ helpers

    /** Order sirf tab jab ye browser use bana chuka ho. */
    private function order(string $uuid): ?Order
    {
        $order = Order::with(['product:id,title,type,creator_id,post_purchase_message', 'product.creator' => fn ($q) => $q->withTrashed()->select('id', 'name'), 'customer.buyer'])
            ->where('uuid', $uuid)->first();

        return $order && CheckoutSession::has($order) ? $order : null;
    }

    /** @return array{0: Order, 1: Buyer} */
    private function paidOrder(string $uuid): array
    {
        $order = $this->order($uuid);

        abort_unless($order && $order->status === 'success' && $order->customer?->buyer, 404);

        return [$order, $order->customer->buyer];
    }

    /**
     * Email hamesha. Mobile sirf tab jab number pehle se verified ho, YA account isi order ne banaya ho aur
     * abhi tak unverified ho (payer hi maalik hai) — purane buyer ka unverified number yahan se verify nahi hota.
     *
     * @return string[]
     */
    private function channels(Order $order, Buyer $buyer): array
    {
        $sms = $buyer->phone && ($buyer->phoneVerified() || (CheckoutSession::createdBuyer($order) && $buyer->unverified()));

        return $sms ? ['email', 'sms'] : ['email'];
    }

    private function channel(Request $request, Order $order, Buyer $buyer): string
    {
        return $request->validate(['channel' => ['required', Rule::in($this->channels($order, $buyer))]])['channel'];
    }

    private function purpose(string $channel): string
    {
        return $channel === 'sms' ? AuthController::SMS : AuthController::EMAIL;
    }

    private function canFixEmail(Order $order, Buyer $buyer): bool
    {
        return CheckoutSession::createdBuyer($order) && $buyer->unverified();
    }
}
