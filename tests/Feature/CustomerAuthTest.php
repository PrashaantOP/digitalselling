<?php

namespace Tests\Feature;

use App\Mail\LoginOtpMail;
use App\Mail\OrderReceiptMail;
use App\Models\Buyer;
use App\Models\Order;
use App\Services\Sms\SmsSender;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Feature\Concerns\SellsProducts;
use Tests\TestCase;

/** Customer portal ka login: email OTP hamesha, mobile SMS OTP sirf verified number pe. */
class CustomerAuthTest extends TestCase
{
    use RefreshDatabase, SellsProducts;

    private Order $order;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeGateways();
        $this->order = $this->buy($this->product($this->seller()));

        // Inertia ke shared props test ke andar ek request se doosri me bache rehte hain (asli request me nahi) —
        // checkout wale request ka `auth` aage ke assertions me na dikhe
        Inertia::flushShared();
    }

    private function buyer(): Buyer
    {
        return Buyer::where('email', 'rohan@test.com')->firstOrFail();
    }

    /** Naya browser — checkout wala session nahi. */
    private function freshBrowser(): void
    {
        $this->flushSession();
    }

    // ---------------------------------------------------------------- email login

    public function test_email_code_signs_the_buyer_in_and_marks_the_email_verified(): void
    {
        $this->freshBrowser();

        $this->get('/me/courses')->assertRedirect('/me/login');
        $this->post('/me/login', ['login' => 'Rohan@Test.com'])->assertRedirect('/me/login/verify');
        $this->post('/me/login/verify', ['code' => $this->emailCode('rohan@test.com')])->assertRedirect('/me/courses');

        $this->assertAuthenticatedAs($this->buyer(), 'customer');
        $this->assertNotNull($this->buyer()->email_verified_at);
        $this->get('/me/courses')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Customer/MyCourses')->where('buyer.email', 'rohan@test.com')->missing('auth'));
    }

    public function test_wrong_and_expired_codes_are_refused(): void
    {
        $this->freshBrowser();
        $this->post('/me/login', ['login' => 'rohan@test.com']);

        $this->post('/me/login/verify', ['code' => '000000'])->assertSessionHasErrors('code');
        $this->assertGuest('customer');

        $this->travel(11)->minutes();
        $this->post('/me/login/verify', ['code' => $this->emailCode()])->assertSessionHasErrors('code');
        $this->assertGuest('customer');
    }

    public function test_unknown_email_looks_exactly_the_same_and_sends_nothing(): void
    {
        $this->freshBrowser();
        Mail::fake();

        $this->post('/me/login', ['login' => 'nobody@test.com'])->assertRedirect('/me/login/verify');
        $this->get('/me/login/verify')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Customer/Verify')->where('to', 'nobody@test.com'));
        $this->post('/me/login/verify', ['code' => '123456'])->assertSessionHasErrors('code');

        Mail::assertNotSent(LoginOtpMail::class);
        $this->assertGuest('customer');
    }

    // ---------------------------------------------------------------- mobile login

    public function test_unverified_mobile_gets_no_sms_and_looks_the_same(): void
    {
        $this->freshBrowser();

        $this->post('/me/login', ['login' => '9930412847'])->assertRedirect('/me/login/verify');
        $this->assertSame([], $this->sms);

        $this->post('/me/login', ['login' => '9000000000'])->assertRedirect('/me/login/verify'); // anjaan number
        $this->assertSame([], $this->sms);

        $this->post('/me/login/verify', ['code' => '123456'])->assertSessionHasErrors('code');
        $this->assertGuest('customer');
    }

    public function test_verified_mobile_signs_in_with_an_sms_code(): void
    {
        $this->buyer()->forceFill(['phone_verified_at' => now()])->save();
        $this->freshBrowser();

        $this->post('/me/login', ['login' => '+91 99304 12847'])->assertRedirect('/me/login/verify');
        $this->assertSame('+919930412847', $this->sms[0]['phone']);

        $this->post('/me/login/verify', ['code' => $this->smsCode()])->assertRedirect('/me/courses');
        $this->assertAuthenticatedAs($this->buyer(), 'customer');
    }

    public function test_sms_provider_failure_is_explained_and_email_still_works(): void
    {
        $this->buyer()->forceFill(['phone_verified_at' => now()])->save();
        $this->freshBrowser();
        $this->app->bind(SmsSender::class, fn () => new class implements SmsSender
        {
            public function sendOtp(string $phone, string $code): void
            {
                throw new \RuntimeException('provider down');
            }
        });

        $this->post('/me/login', ['login' => '9930412847'])->assertSessionHasErrors('login');

        $this->post('/me/login', ['login' => 'rohan@test.com'])->assertRedirect('/me/login/verify');
        $this->post('/me/login/verify', ['code' => $this->emailCode()])->assertRedirect('/me/courses');
    }

    public function test_at_most_five_sms_an_hour_go_to_one_number(): void
    {
        $this->buyer()->forceFill(['phone_verified_at' => now()])->save();
        $this->freshBrowser();

        foreach (range(1, 8) as $i) {
            $this->post('/me/login', ['login' => '9930412847']);
            $this->travel(61)->seconds(); // 60s cooldown paar
        }

        $this->assertCount(5, $this->sms);
    }

    // ---------------------------------------------------------------- done page (pay ke turant baad)

    public function test_done_page_only_opens_in_the_browser_that_paid(): void
    {
        $this->get("/checkout/done/{$this->order->uuid}")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Public/CheckoutDone')
            ->where('order.status', 'success')
            ->where('channels', ['email', 'sms']) // naya buyer — mobile se bhi khol sakta hai
            ->where('canFixEmail', true)
            ->where('openUrl', null)
            ->missing('auth')
        );

        $this->freshBrowser();
        $this->get("/checkout/done/{$this->order->uuid}")->assertRedirect('/me/login');
        $this->post("/checkout/done/{$this->order->uuid}/code", ['channel' => 'email'])->assertNotFound();
    }

    public function test_paying_does_not_sign_anyone_in_until_a_code_is_entered(): void
    {
        $this->assertGuest('customer');
        $this->get('/me/courses')->assertRedirect('/me/login');
    }

    public function test_email_code_on_the_done_page_opens_the_course(): void
    {
        $this->post("/checkout/done/{$this->order->uuid}/code", ['channel' => 'email'])->assertSessionHasNoErrors();
        $response = $this->post("/checkout/done/{$this->order->uuid}/open", ['channel' => 'email', 'code' => $this->emailCode()]);

        $response->assertRedirect();
        $this->assertStringContainsString('/me/courses/', $response->headers->get('Location'));
        $this->assertStringContainsString('/learn', $response->headers->get('Location'));
        $this->assertAuthenticatedAs($this->buyer(), 'customer');
        $this->assertNotNull($this->buyer()->email_verified_at);
        $this->assertNull($this->buyer()->phone_verified_at);
    }

    public function test_sms_code_on_the_done_page_verifies_the_phone_of_a_new_buyer(): void
    {
        $this->post("/checkout/done/{$this->order->uuid}/code", ['channel' => 'sms'])->assertSessionHasNoErrors();
        $this->post("/checkout/done/{$this->order->uuid}/open", ['channel' => 'sms', 'code' => $this->smsCode()])->assertRedirect();

        $this->assertAuthenticatedAs($this->buyer(), 'customer');
        $this->assertNotNull($this->buyer()->phone_verified_at);
    }

    public function test_an_existing_buyers_unverified_phone_cannot_be_verified_from_a_new_order(): void
    {
        // doosri kharid, naye browser se — ye order buyer ko nahi banata
        $this->freshBrowser();
        $second = $this->buy($this->product($this->seller('other'), 'book'));

        $this->get("/checkout/done/{$second->uuid}")->assertInertia(fn (Assert $page) => $page->where('channels', ['email'])->where('canFixEmail', false));
        $this->post("/checkout/done/{$second->uuid}/code", ['channel' => 'sms'])->assertSessionHasErrors('channel');
        $this->assertSame([], $this->sms);
    }

    public function test_a_mistyped_email_can_be_fixed_once_from_the_paying_browser(): void
    {
        Buyer::create(['email' => 'taken@test.com']);

        $this->post("/checkout/done/{$this->order->uuid}/email", ['email' => 'taken@test.com'])->assertSessionHasErrors('email');
        $this->post("/checkout/done/{$this->order->uuid}/email", ['email' => 'Rohan.K@test.com'])->assertSessionHasNoErrors();

        $this->assertSame('rohan.k@test.com', $this->order->fresh()->buyer_email);
        $this->assertNotNull(Buyer::where('email', 'rohan.k@test.com')->first());
        Mail::assertSent(OrderReceiptMail::class, fn ($m) => $m->hasTo('rohan.k@test.com'));

        // verify ho jaane ke baad yahan se email nahi badalta
        Buyer::where('email', 'rohan.k@test.com')->first()->forceFill(['email_verified_at' => now()])->save();
        $this->post("/checkout/done/{$this->order->uuid}/email", ['email' => 'third@test.com'])->assertForbidden();
    }

    // ---------------------------------------------------------------- account page

    public function test_account_page_verifies_a_number_and_the_old_one_stops_working(): void
    {
        $this->asBuyer()->post('/me/account/phone', ['phone' => '9820144321'])->assertSessionHasNoErrors();
        $this->assertSame('+919820144321', end($this->sms)['phone']);
        $this->assertSame('+919930412847', $this->buyer()->phone); // code se pehle kuch nahi badla

        $this->asBuyer()->post('/me/account/phone/verify', ['code' => '000000'])->assertSessionHasErrors('code');
        $this->asBuyer()->post('/me/account/phone/verify', ['code' => $this->smsCode()])->assertSessionHasNoErrors();

        $this->assertSame('+919820144321', $this->buyer()->phone);
        $this->assertNotNull($this->buyer()->phone_verified_at);

        // purane number se ab login nahi
        $this->post('/me/logout');
        $this->freshBrowser();
        $sent = count($this->sms);
        $this->post('/me/login', ['login' => '9930412847']);
        $this->assertCount($sent, $this->sms);
        $this->post('/me/login', ['login' => '9820144321']);
        $this->assertCount($sent + 1, $this->sms);
    }

    public function test_account_page_refuses_a_number_that_belongs_to_another_account(): void
    {
        Buyer::create(['email' => 'other@test.com', 'phone' => '+919820144321']);

        $this->asBuyer()->post('/me/account/phone', ['phone' => '98201 44321'])->assertSessionHasErrors('phone');
        $this->assertSame([], $this->sms);
    }

    // ---------------------------------------------------------------- guards stay apart

    public function test_a_creator_session_does_not_open_the_portal(): void
    {
        $this->freshBrowser();

        $this->actingAs($this->seller('dash'))->get('/me/courses')->assertRedirect('/me/login');
    }

    public function test_a_buyer_session_does_not_open_the_dashboard(): void
    {
        $this->freshBrowser();
        $this->asBuyer();
        $this->app['auth']->shouldUse('web'); // asli request me default guard web hi hota hai; actingAs test me ise badal deta hai

        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_logout_ends_only_the_portal_session(): void
    {
        $this->asBuyer()->post('/me/logout')->assertRedirect('/me/login');

        $this->assertGuest('customer');
    }
}
