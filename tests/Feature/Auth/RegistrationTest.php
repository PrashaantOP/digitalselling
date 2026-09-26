<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered()
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register()
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_new_creator_starts_with_a_90_day_pro_trial()
    {
        $this->post('/register', [
            'name' => 'Trial User',
            'email' => 'trial@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $user = User::where('email', 'trial@example.com')->firstOrFail();

        $this->assertSame('pro', $user->plan);
        $this->assertTrue($user->plan_expires_at->between(now()->addDays(89), now()->addDays(90)->addMinute()));
        $this->assertTrue($user->onPro());
    }
}
