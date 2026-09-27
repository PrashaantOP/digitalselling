<?php

namespace Tests\Feature;

use App\Mail\SecurityNoticeMail;
use App\Models\Admin;
use App\Models\AdminAuditLog;
use App\Models\Order;
use App\Models\PayoutMethod;
use App\Models\Product;
use App\Models\User;
use App\Support\Csv;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SecurityRoundTwoTest extends TestCase
{
    use RefreshDatabase;

    private function creator(array $attrs = []): User
    {
        /** @var User $user */
        $user = User::factory()->createOne(['role' => 'creator', 'username' => 'maker' . User::count()] + $attrs);

        return $user;
    }

    private function subAdminOf(User $creator): User
    {
        $sub = $this->creator();
        $sub->forceFill(['role' => 'sub_admin', 'parent_creator_id' => $creator->id])->save();

        return $sub->fresh();
    }

    private function upi(string $id = 'owner@okaxis'): array
    {
        return ['type' => 'upi', 'upi_id' => $id, 'is_default' => true];
    }

    /* ---------------------------------------------------------------- F1 */

    public function test_sub_admin_cannot_change_payout_kyc_or_payout_profile(): void
    {
        $sub = $this->subAdminOf($this->creator());

        $this->actingAs($sub)->put('/dashboard/payments/account/payout-method', $this->upi('thief@okaxis') + ['current_password' => 'password'])->assertForbidden();
        $this->actingAs($sub)->put('/dashboard/payments/account/profile', ['full_name' => 'Thief'])->assertForbidden();
        $this->actingAs($sub)->post('/dashboard/payments/account/kyc', ['legal_name' => 'Thief'])->assertForbidden();

        $this->assertSame(0, PayoutMethod::count());
    }

    public function test_owner_needs_password_to_change_payout_and_gets_an_alert(): void
    {
        Mail::fake();
        $owner = $this->creator();

        $this->actingAs($owner)->put('/dashboard/payments/account/payout-method', $this->upi())->assertSessionHasErrors('current_password');
        $this->actingAs($owner)->put('/dashboard/payments/account/payout-method', $this->upi() + ['current_password' => 'wrong'])->assertSessionHasErrors('current_password');
        $this->assertSame(0, PayoutMethod::count());

        $this->actingAs($owner)->put('/dashboard/payments/account/payout-method', $this->upi() + ['current_password' => 'password'])->assertSessionHasNoErrors();
        $this->assertSame(1, PayoutMethod::count());
        Mail::assertSent(SecurityNoticeMail::class, fn (SecurityNoticeMail $m) => $m->event === 'payout_method_changed' && $m->hasTo($owner->email));
    }

    /* ---------------------------------------------------------------- F2 */

    public function test_email_change_needs_password_and_alerts_the_old_address(): void
    {
        Mail::fake();
        $user = $this->creator(['email' => 'old@test.com']);

        $this->actingAs($user)->patch('/settings/profile', ['name' => 'Me', 'email' => 'new@test.com'])->assertSessionHasErrors('current_password');
        $this->assertSame('old@test.com', $user->fresh()->email);

        // sirf naam badla — password nahi chahiye
        $this->actingAs($user)->patch('/settings/profile', ['name' => 'Renamed', 'email' => 'old@test.com'])->assertSessionHasNoErrors();

        $this->actingAs($user)->patch('/settings/profile', ['name' => 'Me', 'email' => 'new@test.com', 'current_password' => 'password'])->assertSessionHasNoErrors();
        $this->assertSame('new@test.com', $user->fresh()->email);
        $this->assertNull($user->fresh()->email_verified_at);
        Mail::assertSent(SecurityNoticeMail::class, fn (SecurityNoticeMail $m) => $m->event === 'email_changed' && $m->hasTo('old@test.com'));
    }

    /* ---------------------------------------------------------------- F3 */

    public function test_unverified_email_blocks_money_and_publish_but_not_the_dashboard(): void
    {
        $user = $this->creator(['email_verified_at' => null]);
        $product = Product::create(['creator_id' => $user->id, 'type' => 'payment_page', 'title' => 'Call', 'slug' => 'call-a', 'pricing_type' => 'free', 'price' => 0]);

        $this->actingAs($user)->get('/dashboard')->assertOk();
        $this->actingAs($user)->put('/dashboard/payments/account/payout-method', $this->upi() + ['current_password' => 'password'])->assertRedirect('/verify-email');
        $this->actingAs($user)->post("/dashboard/payment-pages/{$product->uuid}/publish")->assertRedirect('/verify-email');

        $this->assertSame(0, PayoutMethod::count());
        $this->assertNotSame('published', $product->fresh()->status);
    }

    /* ---------------------------------------------------------------- F4 */

    public function test_csv_cells_cannot_become_formulas(): void
    {
        $this->assertSame("'=HYPERLINK(\"x\")", Csv::safe('=HYPERLINK("x")'));
        $this->assertSame("'+91 98765", Csv::safe('+91 98765'));
        $this->assertSame("'@SUM(A1)", Csv::safe('@SUM(A1)'));
        $this->assertSame('Aarav', Csv::safe('Aarav'));
        $this->assertSame(1500, Csv::safe(1500));

        $owner = $this->creator();
        $product = Product::create(['creator_id' => $owner->id, 'type' => 'payment_page', 'title' => 'Call', 'slug' => 'call-b']);
        Order::create([
            'order_number' => 'ORD-0001', 'creator_id' => $owner->id, 'product_id' => $product->id, 'buyer_phone' => '9876543210',
            'buyer_name' => '=cmd|calc', 'base_amount' => 10, 'total_amount' => 10, 'commission_rate' => 10, 'platform_fee' => 1, 'net_payout_amount' => 9, 'status' => 'success',
        ]);

        $csv = $this->actingAs($owner)->get('/dashboard/payments/export')->streamedContent();
        $this->assertStringContainsString("'=cmd|calc", $csv);
    }

    /* ---------------------------------------------------------------- F6 + F11 */

    public function test_register_is_throttled_and_honeypot_blocks_bots(): void
    {
        $this->post('/register', ['name' => 'Bot', 'email' => 'bot@test.com', 'password' => 'Str0ngPassword!', 'password_confirmation' => 'Str0ngPassword!', 'website' => 'spam.example']);
        $this->assertDatabaseMissing('users', ['email' => 'bot@test.com']);

        foreach (range(1, 4) as $i) {
            $this->post('/register', ['name' => "U{$i}", 'email' => "u{$i}@test.com", 'password' => 'x', 'password_confirmation' => 'x']);
        }
        $this->post('/register', ['name' => 'U6', 'email' => 'u6@test.com', 'password' => 'x', 'password_confirmation' => 'x'])->assertStatus(429);
    }

    public function test_auto_username_never_takes_a_reserved_route(): void
    {
        foreach (['Me', 'Book', 'W', 'Invite', 'Privacy Policy'] as $name) {
            $this->assertNotContains(User::uniqueUsername($name), \App\Http\Controllers\Settings\CreatorProfileController::RESERVED_USERNAMES, $name);
        }
    }

    /* ---------------------------------------------------------------- F5 */

    public function test_password_change_and_two_factor_off_send_alerts(): void
    {
        Mail::fake();
        $user = $this->creator();

        $this->actingAs($user)->put('/settings/password', ['current_password' => 'password', 'password' => 'NewStr0ngPass!', 'password_confirmation' => 'NewStr0ngPass!']);
        Mail::assertSent(SecurityNoticeMail::class, fn (SecurityNoticeMail $m) => $m->event === 'password_changed');

        $user->forceFill(['two_factor_enabled' => true])->save();
        $this->actingAs($user->fresh())->delete('/settings/security/two-factor', ['password' => 'NewStr0ngPass!']);
        Mail::assertSent(SecurityNoticeMail::class, fn (SecurityNoticeMail $m) => $m->event === 'two_factor_disabled');
    }

    /* ---------------------------------------------------------------- F8 + F9 */

    public function test_csp_is_enforced_on_admin_and_report_only_elsewhere(): void
    {
        $admin = $this->get('/admin/login');
        $this->assertStringContainsString("frame-ancestors 'none'", (string) $admin->headers->get('Content-Security-Policy'));
        $this->assertStringContainsString("script-src 'self' 'nonce-", (string) $admin->headers->get('Content-Security-Policy'));

        $public = $this->get('/login');
        $this->assertNull($public->headers->get('Content-Security-Policy'));
        $this->assertNotNull($public->headers->get('Content-Security-Policy-Report-Only'));
    }

    public function test_admin_can_reset_a_creators_two_factor_with_reason(): void
    {
        Mail::fake();
        $creator = $this->creator();
        $creator->forceFill(['two_factor_enabled' => true])->save();
        $admin = new Admin(['name' => 'Ops', 'email' => 'ops@platform.test']);
        $admin->forceFill(['password' => 'Sup3r$ecretPass', 'is_active' => true])->save();

        $this->actingAs($admin, 'admin')->post("/admin/creators/{$creator->uuid}/two-factor-reset", [])->assertSessionHasErrors('reason');
        $this->actingAs($admin, 'admin')->post("/admin/creators/{$creator->uuid}/two-factor-reset", ['reason' => 'Verified via registered phone'])->assertSessionHasNoErrors();

        $this->assertFalse($creator->fresh()->two_factor_enabled);
        $this->assertTrue(AdminAuditLog::where('action', 'creator.two_factor_reset')->exists());
        Mail::assertSent(SecurityNoticeMail::class, fn (SecurityNoticeMail $m) => $m->event === 'two_factor_reset');
    }

    /* ---------------------------------------------------------------- roles tenant-scoped */

    public function test_roles_belong_to_one_creator_only(): void
    {
        $storeA = $this->creator();
        $storeB = $this->creator();

        $this->actingAs($storeA)->post('/dashboard/roles', ['name' => 'Editor'])->assertSessionHasNoErrors();
        // dusra store bhi apna "Editor" bana sakta hai — naam global nahi
        $this->actingAs($storeB)->post('/dashboard/roles', ['name' => 'Editor'])->assertSessionHasNoErrors();

        $roleA = \App\Models\Role::where('team_id', $storeA->id)->firstOrFail();
        $this->actingAs($storeB)->put("/dashboard/roles/{$roleA->uuid}", ['name' => 'Hijacked'])->assertNotFound();
        $this->assertSame('Editor', $roleA->fresh()->name);
    }

    /* ---------------------------------------------------------------- F12 */

    public function test_links_must_be_http_or_https(): void
    {
        $owner = $this->creator();

        $this->actingAs($owner)->post('/dashboard/store/header-buttons', ['label' => 'Site', 'url' => 'ftp://files.example.com'])->assertSessionHasErrors('url');
    }
}
