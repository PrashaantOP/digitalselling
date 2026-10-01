<?php

namespace Tests\Feature;

use App\Models\BookingServiceDetail;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductAddon;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Feature\Concerns\SellsProducts;
use Tests\TestCase;

/** Add-ons: creator apne product ke saath doosra product (offer price pe) bech sake. */
class ProductAddonTest extends TestCase
{
    use RefreshDatabase, SellsProducts;

    private User $creator;

    private Product $course;

    private Product $book;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeGateways();

        $this->creator = $this->seller();
        $this->course = $this->product($this->creator, 'course', ['price' => 1000]);
        $this->book = $this->product($this->creator, 'book', ['price' => 799]);
    }

    private function attach(Product $addon, mixed $price = null, ?Product $to = null)
    {
        return $this->actingAs($this->creator)->postJson('/dashboard/products/' . ($to ?? $this->course)->uuid . '/addons', array_filter([
            'addon_product_uuid' => $addon->uuid,
            'price' => $price,
        ], fn ($v) => $v !== null));
    }

    // ---------------------------------------------------------------- add

    public function test_creator_adds_an_addon_by_uuid_at_the_regular_price(): void
    {
        $this->attach($this->book)->assertCreated()
            ->assertJsonPath('addon.price', null)
            ->assertJsonPath('addon.effective_price', 799)
            ->assertJsonPath('addon.product.uuid', $this->book->uuid)
            ->assertJsonMissingPath('addon.product.id');

        $this->assertDatabaseHas('product_addons', ['product_id' => $this->course->id, 'addon_product_id' => $this->book->id, 'price' => null, 'sort_order' => 1]);
    }

    public function test_offer_price_is_stored_and_addons_keep_the_order_they_were_added_in(): void
    {
        $locked = $this->product($this->creator, 'locked_content', ['price' => 300]);

        $this->attach($this->book, 499)->assertCreated()->assertJsonPath('addon.price', 499)->assertJsonPath('addon.effective_price', 499);
        $this->attach($locked)->assertCreated();

        $this->assertSame([$this->book->id, $locked->id], $this->course->addons()->orderBy('sort_order')->pluck('addon_product_id')->all());

        // normal daam ke barabar offer = koi offer nahi (product ka daam baad me badle to add-on ka bhi badle)
        $event = $this->product($this->creator, 'event', ['price' => 200]);
        $this->attach($event, 200)->assertCreated()->assertJsonPath('addon.price', null);
    }

    public function test_products_that_cannot_be_addons_are_refused(): void
    {
        $other = $this->seller('rival');
        $session = Product::create(['creator_id' => $this->creator->id, 'type' => 'booking', 'title' => 'Call', 'slug' => 'call', 'status' => 'published', 'pricing_type' => 'fixed', 'price' => 500]);
        BookingServiceDetail::create(['product_id' => $session->id, 'duration_minutes' => 30, 'is_active' => true]);

        $refused = [
            'another creator\'s product' => $this->product($other, 'book'),
            'a draft' => $this->product($this->creator, 'book', ['status' => 'draft']),
            'a 1:1 session' => $session,
            'a payment page' => $this->product($this->creator, 'payment_page'),
            'pay-what-you-want' => $this->product($this->creator, 'book', ['pricing_type' => 'customer_decides', 'price' => 100]),
            'itself' => $this->course,
        ];

        foreach ($refused as $what => $product) {
            $this->attach($product)->assertUnprocessable()->assertJsonValidationErrors('addon_product_uuid');
        }

        $this->attach($this->book)->assertCreated();
        $this->attach($this->book)->assertUnprocessable()->assertJsonValidationErrors('addon_product_uuid'); // duplicate

        $this->assertSame(1, ProductAddon::count());
    }

    public function test_offer_price_cannot_exceed_the_regular_price_or_be_negative(): void
    {
        $this->attach($this->book, 900)->assertUnprocessable()->assertJsonValidationErrors('price');
        $this->attach($this->book, -1)->assertUnprocessable()->assertJsonValidationErrors('price');
        $this->attach($this->book, 0)->assertCreated()->assertJsonPath('addon.effective_price', 0); // free bonus
    }

    public function test_at_most_five_addons_per_product(): void
    {
        foreach (range(1, ProductAddon::MAX_PER_PRODUCT) as $i) {
            $this->attach($this->product($this->creator, 'book'))->assertCreated();
        }

        $this->attach($this->book)->assertUnprocessable()->assertJsonValidationErrors('addon_product_uuid');
        $this->assertSame(ProductAddon::MAX_PER_PRODUCT, $this->course->addons()->count());
    }

    public function test_sessions_cannot_carry_addons(): void
    {
        $session = Product::create(['creator_id' => $this->creator->id, 'type' => 'booking', 'title' => 'Call', 'slug' => 'call', 'status' => 'published', 'pricing_type' => 'fixed', 'price' => 500]);

        $this->attach($this->book, null, $session)->assertUnprocessable()->assertJsonValidationErrors('addon_product_uuid');
    }

    // ---------------------------------------------------------------- change / remove / access

    public function test_offer_price_can_be_changed_and_cleared_and_the_addon_removed(): void
    {
        $uuid = $this->attach($this->book)->json('addon.uuid');

        $this->actingAs($this->creator)->putJson("/dashboard/product-addons/{$uuid}", ['price' => 399])->assertOk()->assertJsonPath('addon.effective_price', 399);
        $this->actingAs($this->creator)->putJson("/dashboard/product-addons/{$uuid}", ['price' => 5000])->assertUnprocessable()->assertJsonValidationErrors('price');
        $this->actingAs($this->creator)->putJson("/dashboard/product-addons/{$uuid}", ['price' => null])->assertOk()->assertJsonPath('addon.price', null)->assertJsonPath('addon.effective_price', 799);

        $this->actingAs($this->creator)->deleteJson("/dashboard/product-addons/{$uuid}")->assertOk();
        $this->assertSame(0, ProductAddon::count());
    }

    public function test_other_creators_and_unpermitted_team_members_cannot_touch_addons(): void
    {
        $addon = ProductAddon::create(['product_id' => $this->course->id, 'addon_product_id' => $this->book->id]);
        $rival = $this->seller('rival');
        $member = User::factory()->createOne(['role' => 'sub_admin', 'parent_creator_id' => $this->creator->id, 'username' => 'helper']);

        $this->actingAs($rival)->putJson("/dashboard/product-addons/{$addon->uuid}", ['price' => 1])->assertNotFound();
        $this->actingAs($rival)->deleteJson("/dashboard/product-addons/{$addon->uuid}")->assertNotFound();
        $this->actingAs($rival)->postJson("/dashboard/products/{$this->course->uuid}/addons", ['addon_product_uuid' => $this->book->uuid])->assertNotFound();
        $this->actingAs($member)->deleteJson("/dashboard/product-addons/{$addon->uuid}")->assertForbidden();
        // numeric id se kuch nahi
        $this->actingAs($this->creator)->deleteJson("/dashboard/product-addons/{$addon->id}")->assertNotFound();

        $this->assertSame(1, ProductAddon::count());
    }

    public function test_editor_lists_attached_addons_and_only_eligible_choices(): void
    {
        $this->product($this->creator, 'book', ['status' => 'draft', 'title' => 'Draft book']);
        $this->product($this->creator, 'payment_page', ['title' => 'Tip jar']);
        $this->product($this->seller('rival'), 'book', ['title' => 'Rival book']);
        ProductAddon::create(['product_id' => $this->course->id, 'addon_product_id' => $this->book->id, 'price' => 499]);

        $this->actingAs($this->creator)->get("/dashboard/courses/{$this->course->uuid}/edit")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('addons', 1)
            ->where('addons.0.price', 499)
            ->where('addons.0.product.title', $this->book->title)
            ->has('addonOptions', 1) // sirf published book; draft, payment page, doosre ka aur khud course nahi
            ->where('addonOptions.0.uuid', $this->book->uuid)
            ->where('addonOptions.0.unit_price', 799)
        );
    }

    // ---------------------------------------------------------------- checkout

    public function test_checkout_charges_the_offer_price_and_shows_the_regular_price_struck_through(): void
    {
        ProductAddon::create(['product_id' => $this->course->id, 'addon_product_id' => $this->book->id, 'price' => 499]);

        $this->get("/c/{$this->course->slug}")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('product.addons.0.addon_price', 499)
            ->where('product.addons.0.regular_price', 799)
        );

        $this->postJson("/checkout/{$this->course->uuid}/quote", ['addons' => [$this->book->id]])->assertOk()->assertJson(['addons' => 499, 'total' => 1499]);

        $this->checkout($this->course, ['addons' => [$this->book->id]])->assertCreated()->assertJson(['amount' => 149900]);

        $order = Order::firstOrFail();
        $this->assertSame('499.00', $order->addon_amount);
        $this->assertSame('499.00', $order->addonItems()->value('price'));

        // creator baad me offer badle — purana order wahi rehta hai
        ProductAddon::first()->update(['price' => 99]);
        $this->assertSame('499.00', $order->fresh()->addonItems()->value('price'));
    }

    public function test_checkout_page_carries_a_short_public_summary_of_each_addon(): void
    {
        $this->book->update(['description' => '<p>A <strong>practical</strong> guide to tokens.</p>']);
        $this->book->bookDetail->update(['format' => 'pdf', 'pages' => 120]);
        $this->book->coverImages()->create(['image_path' => 'images/maker/book/cover.png', 'sort_order' => 1]);
        ProductAddon::create(['product_id' => $this->course->id, 'addon_product_id' => $this->book->id]);

        $response = $this->get("/c/{$this->course->slug}")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('product.addons.0.summary', 'A practical guide to tokens.') // HTML hata kar saada text
            ->where('product.addons.0.meta', 'PDF · 120 pages')
            ->where('product.addons.0.cover', 'images/maker/book/cover.png')
            ->missing('product.addons.0.description')
        );

        // e-book ki file / link buyer ko pay se pehle kabhi nahi
        $this->assertStringNotContainsString('files.example', $response->getContent());
    }

    public function test_an_unpublished_addon_disappears_from_checkout(): void
    {
        ProductAddon::create(['product_id' => $this->course->id, 'addon_product_id' => $this->book->id]);
        $this->book->update(['status' => 'unpublished']);

        $this->get("/c/{$this->course->slug}")->assertInertia(fn (Assert $page) => $page->has('product.addons', 0));
        $this->checkout($this->course, ['addons' => [$this->book->id]])->assertUnprocessable()->assertJsonValidationErrors('addons');
    }
}
