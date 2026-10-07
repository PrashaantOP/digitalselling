<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Feature\Concerns\SellsProducts;
use Tests\TestCase;

/** "Pay what you want" (customer_decides): buyer apna daam chunta hai, creator ka price minimum hai (kam se kam ₹1). */
class PayWhatYouWantTest extends TestCase
{
    use RefreshDatabase, SellsProducts;

    private User $creator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeGateways();
        $this->creator = $this->seller();
    }

    public function test_a_course_charges_what_the_buyer_chose_and_enrols_them(): void
    {
        $course = $this->product($this->creator, 'course', ['slug' => 'pwyw-course', 'pricing_type' => 'customer_decides', 'price' => 199]);

        // live page ko minimum ke liye price milta hai
        $this->get('/c/pwyw-course')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('product.pricing_type', 'customer_decides')
            ->where('product.price', '199.00')
        );

        $this->checkout($course)->assertUnprocessable()->assertJsonValidationErrors('amount'); // amount bina nahi
        $this->checkout($course, ['amount' => 150])->assertUnprocessable()->assertJsonValidationErrors(['amount' => 'The minimum amount is ₹199.00.']);

        $response = $this->checkout($course, ['amount' => 499])->assertCreated()->assertJson(['amount' => 49900]);
        $this->pay($response->json('order_id'))->assertOk();

        $order = Order::firstOrFail();
        $this->assertSame('success', $order->status);
        $this->assertSame('499.00', $order->total_amount);
        $this->assertSame(1, $course->courseDetail->enrollments()->count());
    }

    public function test_the_minimum_is_one_rupee_when_the_creator_leaves_it_empty(): void
    {
        $course = $this->product($this->creator, 'course', ['pricing_type' => 'customer_decides', 'price' => 0]);

        $this->checkout($course, ['amount' => 0.5])->assertUnprocessable()->assertJsonValidationErrors('amount');
        $this->checkout($course, ['amount' => 1])->assertCreated()->assertJson(['amount' => 100]);
    }

    public function test_the_live_total_follows_the_buyers_amount_and_starts_at_the_minimum(): void
    {
        $course = $this->product($this->creator, 'course', ['pricing_type' => 'customer_decides', 'price' => 199]);

        $this->postJson("/checkout/{$course->uuid}/quote", [])->assertOk()->assertJson(['base' => 199, 'total' => 199]);
        $this->postJson("/checkout/{$course->uuid}/quote", ['amount' => 350])->assertOk()->assertJson(['base' => 350, 'total' => 350]);
    }

    public function test_an_old_fixed_price_discount_never_changes_the_minimum(): void
    {
        // pehle fixed + discount tha, phir creator ne "Customer decides" chuna — purana discount minimum na bane
        $course = $this->product($this->creator, 'course', ['pricing_type' => 'customer_decides', 'price' => 500, 'has_discount' => true, 'discounted_price' => 99]);

        $this->checkout($course, ['amount' => 120])->assertUnprocessable()->assertJsonValidationErrors(['amount' => 'The minimum amount is ₹500.00.']);
    }

    public function test_switching_to_pay_what_you_want_clears_the_discount(): void
    {
        $course = $this->product($this->creator, 'course', ['pricing_type' => 'fixed', 'price' => 999, 'has_discount' => true, 'discounted_price' => 499]);

        $this->actingAs($this->creator)->putJson("/dashboard/courses/{$course->uuid}", ['title' => $course->title, 'pricing_type' => 'customer_decides', 'price' => 199])->assertOk();

        $course->refresh();
        $this->assertSame('customer_decides', $course->pricing_type);
        $this->assertSame('199.00', $course->price);
        $this->assertFalse((bool) $course->has_discount);
        $this->assertNull($course->discounted_price);
    }
}
