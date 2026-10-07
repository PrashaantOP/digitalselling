<?php

namespace Tests\Feature;

use App\Models\BookingServiceDetail;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Feature\Concerns\SellsProducts;
use Tests\TestCase;

/**
 * Har product ka live page khule, sahi price data bheje, aur "jo dikhe wahi kate" — page ka daam = checkout ka total.
 */
class LivePagesTest extends TestCase
{
    use RefreshDatabase, SellsProducts;

    private User $creator;

    /** type => [url prefix, Inertia component] */
    private const PAGES = [
        'course' => ['c', 'Public/Course'],
        'event' => ['e', 'Public/Event'],
        'book' => ['b', 'Public/Book'],
        'locked_content' => ['l', 'Public/LockedContent'],
        'payment_page' => ['p', 'Public/PaymentPage'],
    ];

    /** pricing variant => [attrs, page pe dikhne wala daam (null = buyer chunta hai), checkout me bhejna amount] */
    private const PRICINGS = [
        'fixed' => [['pricing_type' => 'fixed', 'price' => 999], 999.0, null],
        'discount' => [['pricing_type' => 'fixed', 'price' => 999, 'has_discount' => true, 'discounted_price' => 499], 499.0, null],
        'pwyw' => [['pricing_type' => 'customer_decides', 'price' => 199], 350.0, 350],
        'free' => [['pricing_type' => 'free', 'price' => 0], 0.0, null],
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeGateways();
        $this->creator = $this->seller('riya', ['name' => 'Riya Studio']);
        Store::create(['user_id' => $this->creator->id, 'username' => 'riya', 'display_name' => 'Riya Studio', 'is_live' => true]);
    }

    private function make(string $type, string $pricing, array $extra = []): Product
    {
        [$attrs] = self::PRICINGS[$pricing];

        return $this->product($this->creator, $type, $extra + $attrs + ['slug' => "{$type}-{$pricing}"]);
    }

    // ---------------------------------------------------------------- har page khule

    public function test_every_product_type_has_a_working_live_page_for_every_pricing(): void
    {
        foreach (self::PAGES as $type => [$prefix, $component]) {
            foreach (array_keys(self::PRICINGS) as $pricing) {
                $product = $this->make($type, $pricing);

                $this->get("/{$prefix}/{$product->slug}")->assertOk()->assertInertia(fn (Assert $page) => $page
                    ->component($component)
                    ->where('product.pricing_type', $product->pricing_type)
                    ->has('product.price')
                    ->has('product.has_discount')
                    ->has('product.discounted_price')
                    ->has('checkoutUrl')
                );
            }
        }
    }

    public function test_the_event_page_shows_when_and_where_but_never_the_join_link(): void
    {
        $event = $this->make('event', 'fixed');

        $response = $this->get("/e/{$event->slug}")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Public/Event')
            ->where('product.event.mode', 'online')
            ->has('product.event.starts_at')
            ->where('product.event.ended', false)
            ->missing('product.event.join_link')
        );

        $this->assertStringNotContainsString('meet.example', $response->getContent());
    }

    // ---------------------------------------------------------------- jo dikhe wahi kate

    public function test_the_checkout_charges_exactly_what_the_page_shows(): void
    {
        // ek hi test me 20 checkout — checkout ki rate-limit yahan nahi chahiye
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);

        foreach (array_keys(self::PAGES) as $type) {
            foreach (self::PRICINGS as $pricing => [, $shown, $amount]) {
                $product = $this->make($type, $pricing);
                $options = $amount ? ['amount' => $amount] : [];

                $total = $this->postJson("/checkout/{$product->uuid}/quote", $options)->assertOk()->json('total');
                $this->assertEquals($shown, $total, "{$type} / {$pricing}: page shows {$shown}, quote says {$total}");

                $response = $this->checkout($product, $options + ['email' => "{$type}-{$pricing}@test.com", 'phone' => '98200' . str_pad((string) random_int(0, 99999), 5, '0')])->assertCreated();
                $shown > 0
                    ? $response->assertJson(['amount' => (int) round($shown * 100)])
                    : $response->assertJson(['paid' => true]);
            }
        }
    }

    // ---------------------------------------------------------------- discount ke niyam

    public function test_a_zero_discount_is_refused_and_never_makes_a_product_free(): void
    {
        $book = $this->make('book', 'fixed');

        $this->actingAs($this->creator)->putJson("/dashboard/books/{$book->uuid}", ['title' => $book->title, 'has_discount' => true, 'discounted_price' => 0])
            ->assertUnprocessable()->assertJsonValidationErrors('discounted_price');

        // purane data me ₹0 discount pada ho tab bhi poora daam
        $book->forceFill(['has_discount' => true, 'discounted_price' => 0])->save();
        $this->postJson("/checkout/{$book->uuid}/quote", [])->assertOk()->assertJson(['total' => 999]);
        $this->checkout($book)->assertCreated()->assertJson(['amount' => 99900]);
    }

    public function test_lowering_the_price_below_the_discount_is_refused(): void
    {
        $book = $this->make('book', 'discount'); // 999 → 499

        $this->actingAs($this->creator)->putJson("/dashboard/books/{$book->uuid}", ['title' => $book->title, 'price' => 400])
            ->assertUnprocessable()->assertJsonValidationErrors('discounted_price');
        $this->assertSame('999.00', $book->fresh()->price);

        // purane data me discount >= price ho to poora daam (page bhi wahi dikhata hai)
        $book->forceFill(['price' => 400])->save();
        $this->postJson("/checkout/{$book->uuid}/quote", [])->assertOk()->assertJson(['total' => 400]);
    }

    public function test_publishing_needs_a_sensible_discount(): void
    {
        $book = $this->make('book', 'fixed', ['status' => 'draft']);
        $book->forceFill(['has_discount' => true, 'discounted_price' => 1200])->save();

        $this->actingAs($this->creator)->post("/dashboard/books/{$book->uuid}/publish")->assertSessionHasErrors('publish');
        $this->assertSame('draft', $book->fresh()->status);
    }

    // ---------------------------------------------------------------- khatam event

    public function test_an_event_that_has_ended_stops_selling(): void
    {
        $event = $this->make('event', 'fixed');
        $event->eventDetail->update(['starts_at' => now()->subDays(2), 'ends_at' => now()->subDays(2)->addHours(2)]);

        $this->get("/e/{$event->slug}")->assertOk()->assertInertia(fn (Assert $page) => $page->where('product.event.ended', true));
        $this->postJson("/checkout/{$event->uuid}/quote", [])->assertUnprocessable();
        $this->checkout($event)->assertUnprocessable()->assertJsonValidationErrors('product');

        // store / web app ki list se bhi gayab ("Buy now" wala dead end na bane)
        $this->get('/riya')->assertInertia(fn (Assert $page) => $page->has('products', 0));

        // chal raha event (shuru ho gaya, khatam nahi) abhi bik sakta hai
        $event->eventDetail->update(['starts_at' => now()->subHour(), 'ends_at' => now()->addHour()]);
        $this->checkout($event)->assertCreated();
    }

    // ---------------------------------------------------------------- listings

    public function test_store_web_app_and_booking_pages_carry_the_price_data(): void
    {
        $this->make('course', 'pwyw');
        $session = $this->product($this->creator, 'booking', ['slug' => 'call', 'pricing_type' => 'fixed', 'price' => 1499, 'has_discount' => true, 'discounted_price' => 999]);
        BookingServiceDetail::create(['product_id' => $session->id, 'duration_minutes' => 30, 'is_active' => true]);

        foreach (['/riya' => 'Public/Store', '/w/riya' => 'Public/Webapp'] as $url => $component) {
            $this->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
                ->component($component)
                ->has('products', 2)
                ->has('products.0.price')
                ->has('products.0.pricing_type')
            );
        }

        $this->get('/book/riya')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Public/BookingPage')
            ->where('services.0.price', '1499.00')
            ->where('services.0.discounted_price', '999.00')
        );
    }
}

