<?php

namespace Tests\Feature;

use App\Mail\SubAdminInviteMail;
use App\Models\SubAdmin;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SubAdminInviteTest extends TestCase
{
    use RefreshDatabase;

    private function creator(): User
    {
        /** @var User $user */
        $user = User::factory()->createOne(['role' => 'creator', 'username' => 'maker' . User::count()]);

        return $user;
    }

    /** Invite bhejo aur email se raw token nikaalo */
    private function invite(User $creator, string $email = 'helper@test.com'): string
    {
        Mail::fake();
        $this->actingAs($creator)->post('/dashboard/sub-admins', ['email' => $email, 'role' => 'Manager', 'current_password' => 'password'])->assertSessionHasNoErrors();

        $token = null;
        Mail::assertSent(SubAdminInviteMail::class, function (SubAdminInviteMail $m) use (&$token) {
            $token = $m->token;

            return true;
        });
        auth()->guard('web')->logout();

        return $token;
    }

    public function test_invite_needs_password_and_token_is_stored_hashed(): void
    {
        $creator = $this->creator();

        $this->actingAs($creator)->post('/dashboard/sub-admins', ['email' => 'helper@test.com'])->assertSessionHasErrors('current_password');

        $token = $this->invite($creator);

        $row = DB::table('sub_admins')->first();
        $this->assertSame(hash('sha256', $token), $row->invite_token_hash);
        $this->assertStringNotContainsString($token, json_encode($row));
    }

    public function test_new_person_joins_once_and_link_dies(): void
    {
        $creator = $this->creator();
        $token = $this->invite($creator);

        $this->get("/invite/{$token}")->assertOk();
        $this->post("/invite/{$token}", ['name' => 'Helper', 'password' => 'Str0ngPassword!', 'password_confirmation' => 'Str0ngPassword!'])->assertRedirect('/dashboard');

        $helper = User::where('email', 'helper@test.com')->firstOrFail();
        $this->assertSame('sub_admin', $helper->role);
        $this->assertSame($creator->id, $helper->parent_creator_id);
        $this->assertNotNull($helper->email_verified_at);
        $this->assertAuthenticatedAs($helper);
        $this->assertSame('active', SubAdmin::first()->status);

        // dobara wahi link — kaam nahi karta
        auth()->guard('web')->logout();
        $this->post("/invite/{$token}", ['name' => 'X', 'password' => 'Str0ngPassword!', 'password_confirmation' => 'Str0ngPassword!'])->assertNotFound();
    }

    public function test_expired_link_does_not_work(): void
    {
        $token = $this->invite($this->creator());

        Carbon::setTestNow(now()->addDays(8));
        $this->post("/invite/{$token}", ['name' => 'Helper', 'password' => 'Str0ngPassword!', 'password_confirmation' => 'Str0ngPassword!'])->assertNotFound();
        $this->assertDatabaseMissing('users', ['email' => 'helper@test.com']);
        Carbon::setTestNow();
    }

    public function test_another_stores_sub_admin_or_owner_cannot_be_invited(): void
    {
        $storeA = $this->creator();
        $storeB = $this->creator();

        $token = $this->invite($storeA);
        $this->post("/invite/{$token}", ['name' => 'Helper', 'password' => 'Str0ngPassword!', 'password_confirmation' => 'Str0ngPassword!']);
        auth()->guard('web')->logout();

        // store B usi helper ko nahi le sakta
        $this->actingAs($storeB)->post('/dashboard/sub-admins', ['email' => 'helper@test.com', 'role' => 'Manager', 'current_password' => 'password'])->assertSessionHasErrors('email');
        // store B kisi owner creator ko bhi nahi
        $this->actingAs($storeB)->post('/dashboard/sub-admins', ['email' => $storeA->email, 'role' => 'Manager', 'current_password' => 'password'])->assertSessionHasErrors('email');
    }

    public function test_resend_kills_the_old_link(): void
    {
        $creator = $this->creator();
        $old = $this->invite($creator);

        Mail::fake();
        $invite = SubAdmin::firstOrFail();
        $this->actingAs($creator)->post("/dashboard/sub-admins/{$invite->uuid}/resend")->assertSessionHasNoErrors();
        auth()->guard('web')->logout();

        $this->get("/invite/{$old}")->assertInertia(fn ($page) => $page->where('invalid', true));
    }
}
