<?php

namespace Tests\Feature;

use App\Mail\SubAdminInviteMail;
use App\Mail\TeamMemberRemovedMail;
use App\Models\Order;
use App\Models\Product;
use App\Models\Role;
use App\Models\SubAdmin;
use App\Models\TeamActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class TeamTest extends TestCase
{
    use RefreshDatabase;

    private function creator(string $plan = 'free'): User
    {
        /** @var User $user */
        $user = User::factory()->createOne(['role' => 'creator', 'username' => 'maker' . User::count()]);
        $user->forceFill(['plan' => $plan, 'plan_expires_at' => null])->save();

        return $user->fresh();
    }

    /** Owner ke store ka member, given role ke saath (seedha DB — invite flow alag test me) */
    private function member(User $owner, string $role): User
    {
        $this->actingAs($owner)->get('/dashboard/roles'); // ready-made roles bana do

        $sub = User::factory()->createOne(['username' => 'helper' . User::count()]);
        $sub->forceFill(['role' => 'sub_admin', 'parent_creator_id' => $owner->id, 'two_factor_enabled' => true])->save();
        SubAdmin::create(['creator_id' => $owner->id, 'user_id' => $sub->id, 'email' => $sub->email, 'status' => 'active', 'role_name' => $role]);

        app(PermissionRegistrar::class)->setPermissionsTeamId($owner->id);
        $sub->assignRole($role);
        auth()->guard('web')->logout();

        return $sub->fresh();
    }

    private function invite(User $owner, string $email)
    {
        return $this->actingAs($owner)->post('/dashboard/sub-admins', ['email' => $email, 'role' => 'Manager', 'current_password' => 'password']);
    }

    /* ---------------------------------------------------------------- seats */

    public function test_free_plan_gets_one_seat_and_pending_invites_count(): void
    {
        Mail::fake();
        $owner = $this->creator('free');

        $this->invite($owner, 'one@test.com')->assertSessionHasNoErrors();
        $this->invite($owner, 'two@test.com')->assertSessionHasErrors(['email' => 'Your plan includes 1 team member. Upgrade to Plus to add up to 5.']);
        Mail::assertSent(SubAdminInviteMail::class, 1);
    }

    public function test_plus_plan_gets_five_seats(): void
    {
        Mail::fake();
        $owner = $this->creator('plus');

        foreach (range(1, 5) as $i) {
            $this->invite($owner, "m{$i}@test.com")->assertSessionHasNoErrors();
        }
        $this->invite($owner, 'm6@test.com')->assertSessionHasErrors('email');
    }

    public function test_downgrade_keeps_existing_members_but_blocks_new_invites(): void
    {
        Mail::fake();
        $owner = $this->creator('plus');
        $this->invite($owner, 'a@test.com')->assertSessionHasNoErrors();
        $this->invite($owner, 'b@test.com')->assertSessionHasNoErrors();

        $owner->forceFill(['plan' => 'free'])->save();

        $this->assertSame(2, SubAdmin::where('creator_id', $owner->id)->where('status', 'invited')->count());
        $this->invite($owner->fresh(), 'c@test.com')->assertSessionHasErrors('email');
    }

    /* ---------------------------------------------------------------- roles */

    public function test_ready_made_roles_are_created_once_per_creator(): void
    {
        $owner = $this->creator();

        $this->actingAs($owner)->get('/dashboard/roles')->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('Roles/Index')->has('roles', 4)->has('matrix'));
        $this->actingAs($owner)->get('/dashboard/roles');

        $this->assertSame(4, Role::where('team_id', $owner->id)->count());
        $this->assertSame(0, Role::where('team_id', $this->creator()->id)->count());
    }

    public function test_role_permissions_come_only_from_the_catalog_and_edit_implies_view(): void
    {
        $owner = $this->creator();

        // payouts.edit / team.* catalog me hain hi nahi — kisi role me nahi ja sakte
        $this->actingAs($owner)->post('/dashboard/roles', ['name' => 'Sneaky', 'permissions' => ['payouts.edit']])->assertSessionHasErrors('permissions.0');

        $this->actingAs($owner)->post('/dashboard/roles', ['name' => 'Editor', 'permissions' => ['courses.edit']])->assertSessionHasNoErrors();
        $role = Role::where('team_id', $owner->id)->where('name', 'Editor')->firstOrFail();
        $this->assertEqualsCanonicalizing(['courses.view', 'courses.edit'], $role->permissions->pluck('name')->all());
    }

    public function test_role_with_members_cannot_be_deleted(): void
    {
        $owner = $this->creator();
        $this->member($owner, 'Support');
        $role = Role::where('team_id', $owner->id)->where('name', 'Support')->firstOrFail();

        $this->actingAs($owner)->delete("/dashboard/roles/{$role->uuid}")->assertStatus(422);
        $this->assertModelExists($role);
    }

    public function test_another_creators_role_is_not_found(): void
    {
        $storeA = $this->creator();
        $this->actingAs($storeA)->get('/dashboard/roles');
        $role = Role::where('team_id', $storeA->id)->firstOrFail();

        $storeB = $this->creator();
        $this->actingAs($storeB)->put("/dashboard/roles/{$role->uuid}", ['name' => 'Hijacked', 'permissions' => []])->assertNotFound();
        $this->actingAs($storeB)->delete("/dashboard/roles/{$role->uuid}")->assertNotFound();
        $this->assertModelExists($role);
    }

    /* ---------------------------------------------------------------- least privilege */

    public function test_content_editor_sees_only_what_their_role_allows(): void
    {
        $owner = $this->creator();
        $editor = $this->member($owner, 'Content editor');

        $page = Product::create(['creator_id' => $owner->id, 'type' => 'payment_page', 'title' => 'Page', 'slug' => 'page-1', 'revenue_total' => 5000, 'sales_count' => 5]);
        Product::create(['creator_id' => $owner->id, 'type' => 'booking', 'title' => 'Call', 'slug' => 'call-1']);
        Order::create([
            'order_number' => 'ORD-0001', 'creator_id' => $owner->id, 'product_id' => $page->id, 'buyer_phone' => '9876543210', 'buyer_name' => 'Secret Buyer',
            'base_amount' => 5000, 'total_amount' => 5000, 'commission_rate' => 10, 'platform_fee' => 500, 'net_payout_amount' => 4500, 'status' => 'success', 'paid_at' => now(),
        ]);

        // sidebar ke liye permissions — paise wale nahi
        $this->actingAs($editor)->get('/dashboard')->assertOk()->assertInertia(fn (AssertableInertia $p) => $p
            ->where('auth.isOwner', false)
            ->where('canSeeSales', false)
            ->where('stats.revenue.value', 0)
            ->where('recentOrders', [])
            ->where('balance', null)
            ->where('plusOffer', null)
            ->where('auth.permissions', fn ($perms) => collect($perms)->contains('courses.view') && ! collect($perms)->contains('payments.view')));

        // products overview: bookings type nahi (permission nahi), revenue hidden
        $this->actingAs($editor)->get('/dashboard/products')->assertInertia(fn (AssertableInertia $p) => $p
            ->has('products.data', 1)
            ->where('products.data.0.type', 'payment_page')
            ->where('products.data.0.revenueTotal', null)
            ->where('products.data.0.editUrl', "/dashboard/payment-pages/{$page->uuid}/edit"));

        $this->actingAs($editor)->get('/dashboard/payments')->assertForbidden();
        $this->actingAs($editor)->get('/dashboard/refer-earn')->assertForbidden();
        $this->actingAs($editor)->get('/dashboard/sub-admins')->assertForbidden();
        $this->actingAs($editor)->get('/dashboard/roles')->assertForbidden();
    }

    public function test_owner_still_sees_everything(): void
    {
        $owner = $this->creator();

        $this->actingAs($owner)->get('/dashboard')->assertInertia(fn (AssertableInertia $p) => $p->where('auth.isOwner', true)->where('canSeeSales', true)->where('auth.permissions', ['*']));
    }

    /* ---------------------------------------------------------------- remove */

    public function test_removing_a_member_needs_password_and_signs_them_out_immediately(): void
    {
        Mail::fake();
        $owner = $this->creator();
        $sub = $this->member($owner, 'Manager');
        $row = SubAdmin::where('user_id', $sub->id)->firstOrFail();
        DB::table('sessions')->insert(['id' => 'member-sess', 'user_id' => $sub->id, 'payload' => '', 'last_activity' => time()]);

        $this->actingAs($owner)->delete("/dashboard/sub-admins/{$row->uuid}")->assertSessionHasErrors('current_password');
        $this->actingAs($owner)->delete("/dashboard/sub-admins/{$row->uuid}", ['current_password' => 'password'])->assertSessionHasNoErrors();

        $this->assertSame(0, DB::table('sessions')->where('user_id', $sub->id)->count());
        $this->assertSame('suspended', $sub->fresh()->status);
        $this->assertNull($sub->fresh()->parent_creator_id);
        Mail::assertSent(TeamMemberRemovedMail::class, fn ($m) => $m->hasTo($sub->email));
        $this->assertTrue(TeamActivityLog::where('creator_id', $owner->id)->where('action', 'member.removed')->exists());

        // purana session object bhi ab kuch nahi khol sakta
        auth()->guard('web')->logout();
        $this->actingAs($sub->fresh())->get('/dashboard')->assertRedirect('/login');
    }

    /* ---------------------------------------------------------------- 2FA */

    public function test_team_members_always_sign_in_with_a_code(): void
    {
        Mail::fake();
        $owner = $this->creator();
        $sub = $this->member($owner, 'Support');
        $sub->forceFill(['two_factor_enabled' => false])->save(); // flag off ho tab bhi

        $this->post('/login', ['email' => $sub->email, 'password' => 'password'])->assertRedirect('/login/verify');
        $this->assertGuest();

        $this->actingAs($sub->fresh())->delete('/settings/security/two-factor', ['password' => 'password'])->assertForbidden();
    }
}
