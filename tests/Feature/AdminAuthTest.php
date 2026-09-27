<?php

namespace Tests\Feature;

use App\Mail\LoginOtpMail;
use App\Models\Admin;
use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AdminAuthTest extends TestCase
{
    use RefreshDatabase;

    private function admin(array $attrs = []): Admin
    {
        $admin = new Admin(['name' => 'Ops', 'email' => 'ops@platform.test']);
        $admin->forceFill($attrs + ['password' => 'Sup3r$ecretPass', 'is_active' => true])->save();

        return $admin;
    }

    /** Password step → email me aaya code wapas do */
    private function passwordStep(string $email = 'ops@platform.test', string $password = 'Sup3r$ecretPass'): ?string
    {
        $code = null;
        Mail::fake();
        $this->post('/admin/login', ['email' => $email, 'password' => $password]);
        Mail::assertSent(LoginOtpMail::class, function (LoginOtpMail $m) use (&$code) {
            $code = $m->code;

            return true;
        });

        return $code;
    }

    public function test_correct_password_alone_does_not_sign_in(): void
    {
        $this->admin();
        $code = $this->passwordStep();

        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);
        $this->assertGuest('admin');
        $this->get('/admin')->assertRedirect('/admin/login');
    }

    public function test_password_plus_email_code_signs_in_and_is_audited(): void
    {
        $admin = $this->admin();
        $code = $this->passwordStep();

        $this->post('/admin/login/verify', ['code' => $code])->assertRedirect('/admin');
        $this->assertAuthenticatedAs($admin, 'admin');
        $this->get('/admin')->assertOk();

        $this->assertTrue(AdminAuditLog::where('action', 'admin.login')->where('admin_id', $admin->id)->exists());
        $this->assertNotNull($admin->fresh()->last_login_at);
    }

    public function test_wrong_codes_burn_the_code_after_five_tries(): void
    {
        $this->admin();
        $code = $this->passwordStep();
        $wrong = $code === '000000' ? '111111' : '000000';

        foreach (range(1, 4) as $i) {
            $this->post('/admin/login/verify', ['code' => $wrong])->assertSessionHasErrors(['code' => 'That code is not correct.']);
        }
        $this->post('/admin/login/verify', ['code' => $wrong])->assertSessionHasErrors(['code' => 'Too many wrong attempts. Request a new code.']);

        // sahi code bhi ab kaam nahi karega
        $this->post('/admin/login/verify', ['code' => $code])->assertSessionHasErrors('code');
        $this->assertGuest('admin');
    }

    public function test_code_expires_after_ten_minutes(): void
    {
        $this->admin();
        $code = $this->passwordStep();

        Carbon::setTestNow(now()->addMinutes(11));
        // pending login bhi 10 min ka hai — wapas login pe bhejta hai
        $this->post('/admin/login/verify', ['code' => $code])->assertRedirect('/admin/login');
        $this->assertGuest('admin');
        Carbon::setTestNow();
    }

    public function test_resend_has_a_cooldown(): void
    {
        $this->admin();
        $this->passwordStep();

        $this->post('/admin/login/resend')->assertSessionHasErrors('code');

        Carbon::setTestNow(now()->addSeconds(61));
        $this->post('/admin/login/resend')->assertSessionHasNoErrors();
        Carbon::setTestNow();
    }

    public function test_wrong_password_and_inactive_admin_get_the_same_error(): void
    {
        $this->admin(['is_active' => false]);
        Mail::fake();

        $this->post('/admin/login', ['email' => 'ops@platform.test', 'password' => 'Sup3r$ecretPass'])->assertSessionHasErrors(['email' => 'These credentials do not match our records.']);
        $this->post('/admin/login', ['email' => 'nobody@platform.test', 'password' => 'whatever'])->assertSessionHasErrors(['email' => 'These credentials do not match our records.']);

        Mail::assertNothingSent();
        $this->assertSame(2, AdminAuditLog::where('action', 'admin.login_failed')->count());
    }

    public function test_deactivated_admin_is_signed_out_on_next_request(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin, 'admin')->get('/admin')->assertOk();

        $admin->forceFill(['is_active' => false])->save();

        $this->actingAs($admin->fresh(), 'admin')->get('/admin')->assertRedirect('/admin/login');
    }

    public function test_idle_admin_is_signed_out_after_thirty_minutes(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin, 'admin')->get('/admin')->assertOk();

        Carbon::setTestNow(now()->addMinutes(31));
        $this->get('/admin')->assertRedirect('/admin/login');
        $this->assertGuest('admin');
        Carbon::setTestNow();
    }

    public function test_creator_and_admin_sessions_never_cross(): void
    {
        /** @var User $creator */
        $creator = User::factory()->createOne(['role' => 'creator', 'username' => 'maker1']);

        // creator ka session admin panel nahi khol sakta
        $this->actingAs($creator)->get('/admin')->assertRedirect('/admin/login');
        $this->actingAs($creator)->get('/admin/creators')->assertRedirect('/admin/login');

        // asli OTP login se bana admin session creator dashboard nahi khol sakta
        auth()->guard('web')->logout();
        $this->admin();
        $code = $this->passwordStep();
        // login ke baad wahi admin page jo pehle kholne ki koshish hui thi
        $this->post('/admin/login/verify', ['code' => $code])->assertRedirect('/admin/creators');
        $this->assertAuthenticated('admin');
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_admin_pages_are_not_cached_or_indexed(): void
    {
        $this->get('/admin/login')
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow')
            ->assertHeader('Cache-Control', 'no-store, private');
    }
}
