<?php

namespace Tests\Feature;

use App\Models\Buyer;
use App\Models\Customer;
use App\Models\Order;
use App\Support\Phone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\SellsProducts;
use Tests\TestCase;

/** Buyer ki pehchaan: email + phone dono unique, par kisi ka number likh kar uska account nahi milta. */
class BuyerIdentityTest extends TestCase
{
    use RefreshDatabase, SellsProducts;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeGateways();
    }

    public function test_phone_numbers_are_normalised_to_one_shape(): void
    {
        $this->assertSame('+919876543210', Phone::normalize('9876543210'));
        $this->assertSame('+919876543210', Phone::normalize('+91 98765 43210'));
        $this->assertSame('+919876543210', Phone::normalize('098765-43210'));
        $this->assertSame('+14155550123', Phone::normalize('+1 415 555 0123'));
        $this->assertNull(Phone::normalize(' '));
    }

    public function test_one_buyer_per_person_across_creators(): void
    {
        $first = $this->product($this->seller('one'));
        $second = $this->product($this->seller('two'));

        $this->buy($first);
        $this->buy($second, ['email' => 'ROHAN@test.com', 'phone' => '+919930412847']);

        $this->assertSame(1, Buyer::count());
        $this->assertSame(2, Customer::count()); // har creator ki apni CRM row
        $this->assertSame([Buyer::first()->id], Customer::pluck('buyer_id')->unique()->all());
        $this->assertSame('+919930412847', Buyer::first()->phone);
    }

    public function test_a_phone_already_on_another_account_is_refused_without_leaking_that_account(): void
    {
        $product = $this->product($this->seller());
        $this->buy($product);

        $response = $this->checkout($product, ['email' => 'someone.else@test.com'])->assertUnprocessable()->assertJsonValidationErrors('phone');

        $this->assertStringNotContainsString('rohan@test.com', $response->getContent());
        $this->assertSame(1, Buyer::count());
        $this->assertSame(1, Order::count());
    }

    public function test_same_email_with_a_new_number_updates_an_unverified_phone(): void
    {
        $product = $this->product($this->seller(), 'payment_page');
        $this->buy($product);

        $this->buy($product, ['phone' => '9820144321']);

        $this->assertSame(1, Buyer::count());
        $this->assertSame('+919820144321', Buyer::first()->phone);
        $this->assertSame(1, Customer::count());
    }

    public function test_checkout_never_changes_a_verified_phone(): void
    {
        $product = $this->product($this->seller(), 'payment_page');
        $this->buy($product);
        Buyer::first()->forceFill(['phone_verified_at' => now()])->save();

        $this->buy($product, ['phone' => '9820144321']);

        $this->assertSame('+919930412847', Buyer::first()->phone); // login wala number wahi
        $this->assertSame('+919820144321', Order::latest('id')->first()->buyer_phone); // order pe naya contact number
    }

    public function test_typing_someone_elses_number_never_attaches_to_their_purchases(): void
    {
        $creator = $this->seller();
        $course = $this->product($creator);
        $this->buy($course); // Rohan ki kharid

        // attacker: apna email, Rohan ka number
        $this->checkout($this->product($creator, 'book', ['pricing_type' => 'free', 'price' => 0]), ['email' => 'attacker@test.com'])
            ->assertJsonValidationErrors('phone');

        $this->assertNull(Buyer::where('email', 'attacker@test.com')->first());
        $this->assertSame(1, Customer::count());
    }
}
