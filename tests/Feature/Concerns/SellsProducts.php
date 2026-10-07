<?php

namespace Tests\Feature\Concerns;

use App\Mail\LoginOtpMail;
use App\Models\BookDetail;
use App\Models\Buyer;
use App\Models\CourseDetail;
use App\Models\EventDetail;
use App\Models\LockedContentDetail;
use App\Models\Order;
use App\Models\PlanPurchase;
use App\Models\Product;
use App\Models\User;
use App\Services\Sms\SmsSender;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;

/**
 * Buyer checkout / customer portal tests ke common helpers.
 * Razorpay hamesha Http::fake() se, SMS ek fake sender se — asli duniya ko koi call nahi jaati.
 */
trait SellsProducts
{
    protected const RZP_SECRET = 'test_secret';

    protected const RZP_WEBHOOK_SECRET = 'whsec_test';

    protected int $gatewayOrders = 0;

    /** payment id => gateway order id — fake Razorpay "GET /payments/{id}" isi se order aur amount batata hai */
    protected array $gatewayPayments = [];

    /** payment id => entity jo fake Razorpay lautaye (mismatch / authorized jaise case ke liye) */
    protected array $paymentOverrides = [];

    protected int $gatewayRefunds = 0;

    /** true = fake Razorpay refund mana kar de */
    protected bool $refundFails = false;

    /** @var array<int, array{phone: string, code: string}> */
    protected array $sms = [];

    protected function fakeGateways(): void
    {
        config([
            'services.razorpay.key_id' => 'rzp_test_key',
            'services.razorpay.key_secret' => self::RZP_SECRET,
            'services.razorpay.webhook_secret' => self::RZP_WEBHOOK_SECRET,
        ]);

        Mail::fake();
        Http::fake(['api.razorpay.com/*' => fn (HttpRequest $request) => $this->fakeRazorpay($request)]);
        config(['inertia.ssr.enabled' => false]); // SSR ka localhost call stray request na bane
        Http::preventStrayRequests();

        $test = $this;
        $this->app->bind(SmsSender::class, fn () => new class($test) implements SmsSender
        {
            public function __construct(private $test) {}

            public function sendOtp(string $phone, string $code): void
            {
                $this->test->recordSms($phone, $code);
            }
        });
    }

    /** Chhota sa nakli Razorpay — orders, payment fetch / capture, refund. Baaki sab 404. */
    protected function fakeRazorpay(HttpRequest $request)
    {
        $path = (string) parse_url($request->url(), PHP_URL_PATH);

        if ($path === '/v1/orders') {
            return Http::response(['id' => 'order_B' . (++$this->gatewayOrders), 'status' => 'created']);
        }

        if (preg_match('#^/v1/payments/([^/]+)/capture$#', $path, $m)) {
            return Http::response(['id' => $m[1], 'status' => 'captured']);
        }

        if (preg_match('#^/v1/payments/([^/]+)/refund$#', $path, $m)) {
            if ($this->refundFails) {
                return Http::response(['error' => ['description' => 'The payment has been fully refunded already']], 400);
            }

            return Http::response(['id' => 'rfnd_' . (++$this->gatewayRefunds), 'payment_id' => $m[1], 'status' => 'processed']);
        }

        if (preg_match('#^/v1/payments/([^/]+)$#', $path, $m)) {
            if (isset($this->paymentOverrides[$m[1]])) {
                return Http::response($this->paymentOverrides[$m[1]], $this->paymentOverrides[$m[1]]['http_status'] ?? 200);
            }

            $orderId = $this->gatewayPayments[$m[1]] ?? null;
            $total = $orderId ? (Order::where('gateway_order_id', $orderId)->value('total_amount') ?? PlanPurchase::where('gateway_order_id', $orderId)->value('amount_payable')) : null;

            return $total === null
                ? Http::response(['error' => ['description' => 'The id provided does not exist']], 400)
                : Http::response(['id' => $m[1], 'order_id' => $orderId, 'amount' => (int) round((float) $total * 100), 'status' => 'captured']);
        }

        return Http::response(['error' => ['description' => "Not faked: {$request->method()} {$path}"]], 404);
    }

    public function recordSms(string $phone, string $code): void
    {
        $this->sms[] = ['phone' => $phone, 'code' => $code];
    }

    protected function seller(string $username = 'maker', array $attrs = []): User
    {
        /** @var User $creator */
        $creator = User::factory()->createOne($attrs + ['role' => 'creator', 'status' => 'active', 'username' => $username, 'plan' => 'free', 'plan_expires_at' => null]);

        return $creator;
    }

    /** Published product + uske type ki detail row. */
    protected function product(User $creator, string $type = 'course', array $attrs = [], array $detail = []): Product
    {
        $product = Product::create($attrs + [
            'creator_id' => $creator->id, 'type' => $type, 'title' => ucfirst($type) . ' ' . (Product::count() + 1),
            'slug' => $type . '-' . (Product::count() + 1), 'status' => 'published', 'published_at' => now(),
            'pricing_type' => 'fixed', 'price' => 1000,
        ]);

        match ($type) {
            'course' => CourseDetail::create($detail + ['product_id' => $product->id, 'access_type' => 'lifetime']),
            'event' => EventDetail::create($detail + ['product_id' => $product->id, 'mode' => 'online', 'starts_at' => now()->addWeek(), 'join_link' => 'https://meet.example/abc']),
            'book' => BookDetail::create($detail + ['product_id' => $product->id, 'external_link' => 'https://files.example/book.pdf']),
            'locked_content' => LockedContentDetail::create($detail + ['product_id' => $product->id, 'hidden_message' => 'The secret']),
            default => null,
        };

        return $product;
    }

    protected function checkout(Product $product, array $extra = [])
    {
        return $this->postJson("/checkout/{$product->uuid}/order", $extra + ['name' => 'Rohan Kulkarni', 'email' => 'rohan@test.com', 'phone' => '9930412847']);
    }

    /** Checkout.js ke success handler jaisa call — sahi signature ke saath. */
    protected function pay(string $gatewayOrderId, string $paymentId = 'pay_1')
    {
        $this->gatewayPayments[$paymentId] = $gatewayOrderId;

        return $this->postJson('/checkout/verify', [
            'razorpay_order_id' => $gatewayOrderId,
            'razorpay_payment_id' => $paymentId,
            'razorpay_signature' => hash_hmac('sha256', "{$gatewayOrderId}|{$paymentId}", self::RZP_SECRET),
        ]);
    }

    /** Poori kharid: order + payment. Order lautata hai. */
    protected function buy(Product $product, array $extra = []): Order
    {
        $response = $this->checkout($product, $extra)->assertCreated();

        if (! $response->json('paid')) {
            $this->pay($response->json('order_id'), 'pay_' . $this->gatewayOrders)->assertOk();
        }

        return Order::latest('id')->firstOrFail();
    }

    protected function webhook(string $event, string $gatewayOrderId, int $paise, string $paymentId = 'pay_1', ?string $eventId = null)
    {
        return $this->signedWebhook(['event' => $event, 'payload' => ['payment' => ['entity' => ['id' => $paymentId, 'order_id' => $gatewayOrderId, 'amount' => $paise]]]], $eventId);
    }

    /** Koi bhi Razorpay webhook body, sahi signature ke saath. $eventId = X-Razorpay-Event-Id. */
    protected function signedWebhook(array $payload, ?string $eventId = null)
    {
        $body = json_encode($payload);

        return $this->call('POST', '/webhooks/razorpay', [], [], [], array_filter([
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_RAZORPAY_SIGNATURE' => hash_hmac('sha256', $body, self::RZP_WEBHOOK_SECRET),
            'HTTP_X_RAZORPAY_EVENT_ID' => $eventId,
        ]), $body);
    }

    /** Sabse naya email OTP (Mail::fake se). */
    protected function emailCode(?string $to = null): string
    {
        $mail = Mail::sent(LoginOtpMail::class, fn ($m) => $to === null || $m->hasTo($to))->last();
        $this->assertNotNull($mail, 'No login code email was sent' . ($to ? " to {$to}" : '') . '.');

        return $mail->code;
    }

    protected function smsCode(): string
    {
        $this->assertNotEmpty($this->sms, 'No SMS was sent.');

        return end($this->sms)['code'];
    }

    /** OTP flow se guzre bina buyer ko portal me login karo. */
    protected function asBuyer(string $email = 'rohan@test.com'): static
    {
        return $this->actingAs(Buyer::where('email', $email)->firstOrFail(), 'customer');
    }
}
