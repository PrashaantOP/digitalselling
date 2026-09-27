<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\SubAdmin;
use App\Models\User;
use App\Support\DeviceTracker;
use App\Support\TeamActivity;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Spatie\Permission\PermissionRegistrar;

/**
 * GET/POST /invite/{token} — creator ka bheja hua team invite.
 * Naya insaan: naam + password se sub_admin account (email link se hi aaya, isliye verified).
 * Pehle se sub_admin account: apna password daal ke (ownership proof) is store se jud jaata hai.
 * Link ek baar chalta hai aur 7 din me expire.
 */
class AcceptInviteController extends Controller
{
    public function show(string $token)
    {
        $invite = SubAdmin::findPendingByToken($token);

        if (! $invite) {
            return Inertia::render('auth/accept-invite', ['invalid' => true]);
        }

        return Inertia::render('auth/accept-invite', [
            'invalid' => false,
            'email' => $invite->email,
            'creatorName' => $invite->creator?->name,
            'role' => $invite->role_name,
            'hasAccount' => User::where('email', $invite->email)->exists(),
        ]);
    }

    public function store(Request $request, string $token): RedirectResponse
    {
        $invite = SubAdmin::findPendingByToken($token);
        abort_unless($invite && $invite->creator?->status === 'active', 404);

        $existing = User::where('email', $invite->email)->first();

        if ($existing) {
            $request->validate(['password' => ['required', 'string']]);

            // sirf wahi sub_admin jo kisi aur store ka member nahi — aur password se ownership proof
            if ($existing->role !== 'sub_admin' || ($existing->parent_creator_id && $existing->parent_creator_id !== $invite->creator_id) || ! Hash::check($request->input('password'), $existing->password)) {
                throw ValidationException::withMessages(['password' => 'We could not add this account to the team.']);
            }

            $user = $existing;
        } else {
            $data = $request->validate([
                'name' => ['required', 'string', 'max:150'],
                'password' => ['required', 'confirmed', Password::defaults()],
            ]);

            $user = new User;
            $user->forceFill([
                'name' => $data['name'],
                'email' => $invite->email,
                'password' => $data['password'],
                'email_verified_at' => now(), // link isi email pe aaya tha
            ]);
        }

        DB::transaction(function () use ($invite, $user) {
            // team member ke liye two-step hamesha on (Settings me band nahi kar sakta)
            $user->forceFill(['role' => 'sub_admin', 'parent_creator_id' => $invite->creator_id, 'status' => 'active', 'two_factor_enabled' => true])->save();

            $invite->forceFill([
                'status' => 'active',
                'user_id' => $user->id,
                'accepted_at' => now(),
                'invite_token_hash' => null, // ek hi baar
                'invite_expires_at' => null,
            ])->save();

            if ($invite->role_name) {
                app(PermissionRegistrar::class)->setPermissionsTeamId($invite->creator_id);
                $user->syncRoles([$invite->role_name]);
            }
        });

        TeamActivity::log($invite->creator_id, 'member.joined', $user->email, ['role' => $invite->role_name], $user);

        Auth::guard('web')->login($user);
        $request->session()->regenerate();
        DeviceTracker::recordLogin($user, $request, notify: false);

        return redirect()->route('dashboard');
    }
}
