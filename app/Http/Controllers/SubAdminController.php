<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Mail\SubAdminInviteMail;
use App\Mail\TeamMemberRemovedMail;
use App\Models\Role;
use App\Models\SubAdmin;
use App\Models\TeamActivityLog;
use App\Models\User;
use App\Support\TeamActivity;
use App\Support\TeamRoles;
use App\Support\TeamSeats;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Team (sub-admins) — sirf owner creator (routes pe `owner` middleware).
 * Seats: Free 1, Pro 5 (TeamSeats). Har access-badalne wala kaam password dobara maangta hai
 * aur TeamActivity me log hota hai.
 */
class SubAdminController extends Controller
{
    use RespondsFlexibly;

    private function roleNames(): Collection
    {
        return Role::where('team_id', $this->tid())->pluck('name');
    }

    public function index()
    {
        $creator = auth()->user();
        TeamRoles::ensureDefaults($creator);

        $rows = SubAdmin::with('user:id,name,email,two_factor_enabled')->where('creator_id', $creator->id)
            ->whereIn('status', ['invited', 'active'])->latest()->get();

        // last active: chalu session ya aakhri login device
        $userIds = $rows->pluck('user_id')->filter();
        $sessionSeen = DB::table('sessions')->whereIn('user_id', $userIds)->select('user_id', DB::raw('MAX(last_activity) as t'))->groupBy('user_id')->pluck('t', 'user_id');
        $deviceSeen = DB::table('user_devices')->whereIn('user_id', $userIds)->select('user_id', DB::raw('MAX(last_seen_at) as t'))->groupBy('user_id')->pluck('t', 'user_id');

        return Inertia::render('SubAdmins/Index', [
            'members' => $rows->map(function (SubAdmin $s) use ($sessionSeen, $deviceSeen) {
                $seen = collect([
                    isset($sessionSeen[$s->user_id]) ? (int) $sessionSeen[$s->user_id] : null,
                    isset($deviceSeen[$s->user_id]) ? strtotime($deviceSeen[$s->user_id]) : null,
                ])->filter()->max();

                return [
                    'uuid' => $s->uuid,
                    'name' => $s->user?->name,
                    'email' => $s->email,
                    'role' => $s->role_name,
                    'status' => $s->status,
                    'invited_at' => $s->invited_at?->toIso8601String(),
                    'invite_expires_at' => $s->invite_expires_at?->toIso8601String(),
                    'accepted_at' => $s->accepted_at?->toIso8601String(),
                    'last_active_at' => $seen ? date(DATE_ATOM, $seen) : null,
                    'two_factor' => (bool) ($s->user?->two_factor_enabled ?? true),
                ];
            })->values(),
            'roles' => Role::where('team_id', $creator->id)->orderByDesc('is_template')->orderBy('name')->get(['uuid', 'name', 'is_template']),
            'seats' => TeamSeats::summary($creator),
        ]);
    }

    public function activity()
    {
        return Inertia::render('SubAdmins/Activity', [
            'entries' => TeamActivityLog::with('actor:id,name')->where('creator_id', $this->tid())->latest('id')->paginate(50)
                ->through(fn (TeamActivityLog $l) => [
                    'id' => $l->id,
                    'action' => $l->action,
                    'subject' => $l->subject,
                    'meta' => $l->meta,
                    'actor' => $l->actor?->name,
                    'ip' => $l->ip,
                    'created_at' => $l->created_at?->toIso8601String(),
                ]),
        ]);
    }

    public function store(Request $request)
    {
        // owner ne Team page kabhi na khola ho tab bhi ready-made roles maujood hon
        TeamRoles::ensureDefaults(auth()->user());

        $data = $request->validate([
            'email' => ['required', 'email', 'max:150'],
            // bina role ka member kuch kar hi nahi sakta — confusing, isliye zaroori
            'role' => ['required', Rule::in($this->roleNames()->all())],
            // team me kisi ko laana = store ka access dena — password dobara
            'current_password' => ['required', 'current_password'],
        ]);

        $creator = auth()->user();
        $email = strtolower($data['email']);

        if (TeamSeats::used($creator) >= ($limit = TeamSeats::limit($creator))) {
            throw ValidationException::withMessages(['email' => $limit === 1
                ? 'Your plan includes 1 team member. Upgrade to Pro to add up to 5.'
                : "You've used all {$limit} team seats. Remove someone to invite another person."]);
        }

        if ($email === strtolower($creator->email)) {
            throw ValidationException::withMessages(['email' => 'You cannot invite yourself.']);
        }

        if (SubAdmin::where('creator_id', $creator->id)->where('email', $email)->live()->exists()) {
            throw ValidationException::withMessages(['email' => 'This person is already on your team or invited.']);
        }

        // Kisi aur creator ka owner/customer account, ya dusre store ka active sub-admin, yahan nahi aa sakta
        $other = User::where('email', $email)->first();
        if ($other && ($other->role !== 'sub_admin' || ($other->parent_creator_id && $other->parent_creator_id !== $creator->id))) {
            throw ValidationException::withMessages(['email' => 'This email belongs to an account that cannot be added as a sub-admin.']);
        }

        $invite = SubAdmin::create(['creator_id' => $creator->id, 'email' => $email, 'role_name' => $data['role'], 'status' => 'invited']);
        $token = $invite->issueInvite();

        Mail::to($email)->send(new SubAdminInviteMail($invite, $creator->name, $token));
        TeamActivity::log($creator->id, 'member.invited', $email, ['role' => $data['role']]);

        return $this->done($request, 'Invitation sent.', ['uuid' => $invite->uuid], null, 201);
    }

    public function resend(Request $request, SubAdmin $subAdmin)
    {
        abort_unless($subAdmin->status === 'invited', 422, 'Only pending invites can be resent.');

        // naya link — purana isi waqt bekaar
        $token = $subAdmin->issueInvite();

        Mail::to($subAdmin->email)->send(new SubAdminInviteMail($subAdmin, auth()->user()->name, $token));
        TeamActivity::log($this->tid(), 'invite.resent', $subAdmin->email);

        return $this->done($request, 'Invitation resent.');
    }

    public function updateRole(Request $request, SubAdmin $subAdmin)
    {
        $data = $request->validate([
            'role' => ['required', Rule::in($this->roleNames()->all())],
            'current_password' => ['required', 'current_password'],
        ]);

        abort_if($subAdmin->status === 'revoked', 422, 'This person is no longer on your team.');

        $from = $subAdmin->role_name;
        $subAdmin->update(['role_name' => $data['role']]);

        // accepted account hai to Spatie role abhi badal do (team context middleware ne set kar diya hai)
        if ($subAdmin->user) {
            $subAdmin->user->syncRoles([$data['role']]);
        }

        TeamActivity::log($this->tid(), 'member.role_changed', $subAdmin->email, ['from' => $from, 'to' => $data['role']]);

        return $this->done($request, 'Role updated.');
    }

    /** Remove member / cancel invite. Access turant khatam — chalu sessions bhi. */
    public function revoke(Request $request, SubAdmin $subAdmin)
    {
        $request->validate(['current_password' => ['required', 'current_password']]);
        abort_if($subAdmin->status === 'revoked', 422, 'Already removed.');

        $wasActive = $subAdmin->status === 'active';
        $user = $subAdmin->user;

        DB::transaction(function () use ($subAdmin, $user) {
            if ($user) {
                $user->syncRoles([]);
                // remember_token badla = "Keep me logged in" cookie bhi bekaar
                $user->forceFill(['status' => 'suspended', 'parent_creator_id' => null, 'remember_token' => Str::random(60)])->save();
                DB::table('sessions')->where('user_id', $user->id)->delete();
            }

            $subAdmin->update(['status' => 'revoked']);
            $subAdmin->forceFill(['invite_token_hash' => null, 'invite_expires_at' => null])->save();
        });

        if ($wasActive && $user) {
            try {
                Mail::to($user->email)->send(new TeamMemberRemovedMail($user->name ?? '', auth()->user()->name));
            } catch (\Throwable $e) {
                report($e);
            }
        }

        TeamActivity::log($this->tid(), $wasActive ? 'member.removed' : 'invite.cancelled', $subAdmin->email);

        return $this->done($request, $wasActive ? 'Access removed.' : 'Invitation cancelled.');
    }
}
