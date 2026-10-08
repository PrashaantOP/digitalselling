<?php

namespace Tests\Feature;

use App\Mail\LoginOtpMail;
use App\Mail\NewDeviceLoginMail;
use App\Models\User;
use App\Support\DeviceTracker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class CreatorSecurityTest extends TestCase
{
    use RefreshDatabase;

    private function creator(array $attrs = []): User
    {
        /** @var User $user */
        $user = User::factory()->createOne(['role' => 'creator', 'username' => 'maker' . User::count()] + $attrs);

        return $user;
    }

    public function test_suspended_creator_cannot_log_in(): void
    {
        $user = $this->creator(['status' => 'suspended']);

        $this->post('/login', ['email' => $user->email, 'password' => 'password'])
            ->assertSessionHasErrors(['email' => 'Your account is suspended. Please contact support.']);

        $this->assertGuest();
    }

    public function test_suspending_mid_session_logs_the_creator_out(): void
    {
        $user = $this->creator();
        $this->actingAs($user)->get('/dashboard')->assertOk();

        $user->forceFill(['status' => 'suspended'])->save();

        $this->actingAs($user->fresh())->get('/dashboard')->assertRedirect('/login');
        $this->assertGuest();
    }

    public function test_role_status_and_plan_are_not_mass_assignable(): void
    {
        $user = $this->creator();

        $user->fill(['role' => 'sub_admin', 'status' => 'suspended', 'plan' => 'plus', 'parent_creator_id' => 1, 'name' => 'New name'])->save();
        $user->refresh();

        $this->assertSame('creator', $user->role);
        $this->assertSame('active', $user->status);
        $this->assertSame('New name', $user->name);
    }

    public function test_weak_passwords_are_rejected_on_register(): void
    {
        $this->post('/register', ['name' => 'Weak', 'email' => 'weak@test.com', 'password' => 'password', 'password_confirmation' => 'password'])
            ->assertSessionHasErrors('password');

        $this->assertGuest();
    }

    public function test_one_ip_cannot_hammer_login_with_many_emails(): void
    {
        foreach (range(1, 20) as $i) {
            $this->post('/login', ['email' => "nobody{$i}@test.com", 'password' => 'nope']);
        }

        $this->post('/login', ['email' => 'another@test.com', 'password' => 'nope'])->assertStatus(429);
    }

    public function test_new_device_login_sends_an_email_but_known_device_does_not(): void
    {
        Mail::fake();
        $user = $this->creator();

        $this->post('/login', ['email' => $user->email, 'password' => 'password'])->assertRedirect('/dashboard');
        Mail::assertSent(NewDeviceLoginMail::class, 1);
        $token = collect($this->app['cookie']->getQueuedCookies())->firstWhere(fn ($c) => $c->getName() === DeviceTracker::COOKIE)?->getValue();
        $this->assertNotEmpty($token);

        // same browser (cookie ke saath) dobara login → koi email nahi
        auth()->guard('web')->logout();
        $this->withCookie(DeviceTracker::COOKIE, $token)->post('/login', ['email' => $user->email, 'password' => 'password']);
        Mail::assertSent(NewDeviceLoginMail::class, 1);
        $this->assertSame(1, DB::table('user_devices')->where('user_id', $user->id)->count());
    }

    public function test_sessions_list_and_sign_out_other_devices(): void
    {
        $user = $this->creator();
        DB::table('sessions')->insert([
            ['id' => 'other-1', 'user_id' => $user->id, 'ip_address' => '10.0.0.1', 'user_agent' => 'Mozilla/5.0 (iPhone) Safari/604.1', 'payload' => '', 'last_activity' => time() - 600],
        ]);

        $this->actingAs($user)->get('/settings/security')
            ->assertInertia(fn (AssertableInertia $page) => $page->component('settings/security')->where('sessions.0.device', 'Safari on iOS')->missing('sessions.0.id'));

        $this->actingAs($user)->delete('/settings/security/sessions', ['password' => 'wrong'])->assertSessionHasErrors('password');
        $this->actingAs($user)->delete('/settings/security/sessions', ['password' => 'password'])->assertSessionHasNoErrors();

        $this->assertSame(0, DB::table('sessions')->where('id', 'other-1')->count());
    }

    public function test_changing_password_signs_out_other_devices(): void
    {
        $user = $this->creator();
        DB::table('sessions')->insert(['id' => 'other-2', 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);

        $this->actingAs($user)->put('/settings/password', ['current_password' => 'password', 'password' => 'NewStr0ngPass!', 'password_confirmation' => 'NewStr0ngPass!'])
            ->assertSessionHasNoErrors();

        $this->assertSame(0, DB::table('sessions')->where('id', 'other-2')->count());
    }

    public function test_two_factor_setup_and_login(): void
    {
        Mail::fake();
        $user = $this->creator();

        // on karne ke liye pehle password, phir email pe aaya code
        $this->actingAs($user)->post('/settings/security/two-factor/code', ['password' => 'password'])->assertSessionHasNoErrors();
        $setupCode = $this->lastOtp();
        $this->actingAs($user)->post('/settings/security/two-factor', ['code' => $setupCode])->assertSessionHasNoErrors();
        $this->assertTrue($user->fresh()->two_factor_enabled);

        // ab login pe password ke baad code maanga jaata hai
        auth()->guard('web')->logout();
        $this->post('/login', ['email' => $user->email, 'password' => 'password'])->assertRedirect('/login/verify');
        $this->assertGuest();
        $this->get('/dashboard')->assertRedirect('/login');

        $this->post('/login/verify', ['code' => '000000' === $this->lastOtp() ? '111111' : '000000'])->assertSessionHasErrors('code');
        $this->post('/login/verify', ['code' => $this->lastOtp()])->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($user->fresh());
    }

    private function lastOtp(): string
    {
        $code = null;
        Mail::assertSent(LoginOtpMail::class, function (LoginOtpMail $m) use (&$code) {
            $code = $m->code;

            return true;
        });

        return (string) $code;
    }

    public function test_security_headers_are_sent(): void
    {
        $this->get('/login')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }
}
