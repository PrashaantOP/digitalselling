<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Role;
use App\Models\SubAdmin;
use App\Support\TeamActivity;
use App\Support\TeamPermissions;
use App\Support\TeamRoles;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Team roles ("Manager", "Support"...) — har creator ki apni team (Spatie team_id = creator id) ke andar.
 * Permissions sirf TeamPermissions catalog se — owner-only cheezein (payout, KYC, billing, team) kisi role
 * me di hi nahi ja saktin.
 */
class RoleController extends Controller
{
    use RespondsFlexibly;

    public function index()
    {
        $tid = $this->tid();
        TeamRoles::ensureDefaults(auth()->user());

        // role => kitne members (accepted) + kitne pending invites
        $members = DB::table('model_has_roles')->where('team_id', $tid)->select('role_id', DB::raw('COUNT(*) as c'))->groupBy('role_id')->pluck('c', 'role_id');
        $pending = SubAdmin::where('creator_id', $tid)->where('status', 'invited')->select('role_name', DB::raw('COUNT(*) as c'))->groupBy('role_name')->pluck('c', 'role_name');

        return Inertia::render('Roles/Index', [
            'roles' => Role::with('permissions:id,name')->where('team_id', $tid)->orderByDesc('is_template')->orderBy('name')->get()
                ->map(fn (Role $r) => [
                    'uuid' => $r->uuid,
                    'name' => $r->name,
                    'is_template' => (bool) $r->is_template,
                    'description' => TeamPermissions::TEMPLATES[$r->name]['description'] ?? null,
                    'permissions' => $r->permissions->pluck('name')->values(),
                    'members' => (int) ($members[$r->id] ?? 0) + (int) ($pending[$r->name] ?? 0),
                ]),
            'matrix' => TeamPermissions::matrix(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $role = new Role;
        $role->forceFill(['name' => $data['name'], 'guard_name' => 'web', 'team_id' => $this->tid()])->save();
        $role->syncPermissions(TeamPermissions::normalize($data['permissions'] ?? []));

        TeamActivity::log($this->tid(), 'role.created', $role->name, ['permissions' => $role->permissions->pluck('name')]);

        return $this->done($request, 'Role created.', ['role' => $role->only(['uuid', 'name'])], null, 201);
    }

    public function update(Request $request, Role $role)
    {
        $data = $this->validated($request, $role);
        $before = $role->name;

        if (isset($data['name']) && $data['name'] !== $role->name) {
            // pending invites bhi naye naam se jude rahein
            SubAdmin::where('creator_id', $this->tid())->where('role_name', $role->name)->update(['role_name' => $data['name']]);
            $role->forceFill(['name' => $data['name']])->save();
        }

        if (array_key_exists('permissions', $data)) {
            $role->syncPermissions(TeamPermissions::normalize($data['permissions'] ?? []));
        }

        TeamActivity::log($this->tid(), 'role.updated', $role->name, ['renamed_from' => $before !== $role->name ? $before : null, 'permissions' => $role->permissions()->pluck('name')]);

        return $this->done($request, 'Role updated.');
    }

    /** Jis role pe koi member ya pending invite ho, wo delete nahi — pehle unhe dusra role do. */
    public function destroy(Request $request, Role $role)
    {
        $inUse = DB::table('model_has_roles')->where('team_id', $this->tid())->where('role_id', $role->id)->exists()
            || SubAdmin::where('creator_id', $this->tid())->where('status', 'invited')->where('role_name', $role->name)->exists();

        abort_if($inUse, 422, 'Move members to another role first.');

        $name = $role->name;
        $role->delete();
        TeamActivity::log($this->tid(), 'role.deleted', $name);

        return $this->done($request, 'Role deleted.');
    }

    private function validated(Request $request, ?Role $role = null): array
    {
        return $request->validate([
            'name' => [
                $role ? 'sometimes' : 'required', 'string', 'max:50',
                Rule::unique('roles', 'name')->where('team_id', $this->tid())->where('guard_name', 'web')->ignore($role?->id),
            ],
            'permissions' => ['array'],
            // sirf catalog — koi bhi DB permission naam nahi
            'permissions.*' => ['string', Rule::in(TeamPermissions::all())],
        ]);
    }
}
