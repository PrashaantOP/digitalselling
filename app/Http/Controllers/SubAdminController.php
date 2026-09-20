<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Mail\SubAdminInviteMail;
use App\Models\SubAdmin;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class SubAdminController extends Controller
{
    use RespondsFlexibly;

    private function teamKey(): string
    {
        return config('permission.column_names.team_foreign_key', 'team_id');
    }

    private function roleNames(): \Illuminate\Support\Collection
    {
        return Role::where($this->teamKey(), $this->tid())->pluck('name');
    }

    public function index()
    {
        $invites = SubAdmin::with('user:id,name,email,avatar')->where('creator_id', $this->tid())->latest()->get()
            ->map(function (SubAdmin $s) {
                $s->setAttribute('role_name', $s->role_name ?? $s->user?->roles()->pluck('name')->first());
                return $s->makeHidden('invite_token');
            });

        return Inertia::render('SubAdmins/Index', [
            'subAdmins' => $invites,
            'roles' => $this->roleNames(),
        ]);
    }

    /** Invite bhejo (role optional — accept hone pe assign hoga). */
    public function store(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:150'],
            'role' => ['nullable', Rule::in($this->roleNames()->all())],
        ]);

        $creator = auth()->user();
        $email = strtolower($data['email']);

        if ($email === strtolower($creator->email)) {
            throw ValidationException::withMessages(['email' => 'You cannot invite yourself.']);
        }

        $exists = SubAdmin::where('creator_id', $creator->id)->where('email', $email)->whereIn('status', ['invited', 'active'])->exists();
        if ($exists) {
            throw ValidationException::withMessages(['email' => 'This person is already invited.']);
        }

        // Kisi aur creator ka owner/customer account sub-admin nahi ban sakta
        $other = User::where('email', $email)->first();
        if ($other && $other->role !== 'sub_admin') {
            throw ValidationException::withMessages(['email' => 'This email belongs to an account that cannot be added as a sub-admin.']);
        }

        $invite = SubAdmin::create([
            'creator_id' => $creator->id,
            'email' => $email,
            'role_name' => $data['role'] ?? null,
            'status' => 'invited',
            'invite_token' => Str::random(64),
            'invited_at' => now(),
        ]);

        Mail::to($email)->send(new SubAdminInviteMail($invite, $creator->name));

        return $this->done($request, 'Invitation sent.', ['id' => $invite->id], null, 201);
    }

    public function resend(Request $request, SubAdmin $subAdmin)
    {
        abort_unless($subAdmin->status === 'invited', 422, 'Only pending invites can be resent.');

        $subAdmin->update(['invite_token' => Str::random(64), 'invited_at' => now()]);

        Mail::to($subAdmin->email)->send(new SubAdminInviteMail($subAdmin, auth()->user()->name));

        return $this->done($request, 'Invitation resent.');
    }

    public function updateRole(Request $request, SubAdmin $subAdmin)
    {
        $data = $request->validate(['role' => ['required', Rule::in($this->roleNames()->all())]]);

        $subAdmin->update(['role_name' => $data['role']]);

        // accepted account hai to Spatie role abhi badal do (team context middleware ne set kar diya hai)
        if ($subAdmin->user) {
            $subAdmin->user->syncRoles([$data['role']]);
        }

        return $this->done($request, 'Role updated.');
    }

    public function revoke(Request $request, SubAdmin $subAdmin)
    {
        if ($subAdmin->user) {
            $subAdmin->user->syncRoles([]);
            $subAdmin->user->update(['status' => 'suspended', 'parent_creator_id' => null]);
        }

        $subAdmin->update(['status' => 'revoked', 'invite_token' => null]);

        return $this->done($request, 'Access revoked.');
    }
}
