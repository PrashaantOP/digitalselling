<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/** Custom roles ("Manager", "Support"...) — har creator ki apni team ke andar. */
class RoleController extends Controller
{
    use RespondsFlexibly;

    private function teamKey(): string
    {
        return config('permission.column_names.team_foreign_key', 'team_id');
    }

    public function index()
    {
        return Inertia::render('Roles/Index', [
            'roles' => Role::with('permissions:id,name')->where($this->teamKey(), $this->tid())->orderBy('name')->get(),
            // module => [permissions...]  (frontend toggle matrix ke liye)
            'permissions' => Permission::orderBy('name')->pluck('name')
                ->groupBy(fn ($n) => explode('.', $n)[0])->map->values(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => [
                'required', 'string', 'max:50',
                Rule::unique('roles', 'name')->where($this->teamKey(), $this->tid())->where('guard_name', 'web'),
            ],
            'permissions' => ['array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')],
        ]);

        $role = Role::create(['name' => $data['name'], 'guard_name' => 'web', $this->teamKey() => $this->tid()]);
        $role->syncPermissions($data['permissions'] ?? []);

        return $this->done($request, 'Role created.', ['role' => $role->load('permissions:id,name')], null, 201);
    }

    public function update(Request $request, Role $role)
    {
        $data = $request->validate([
            'name' => [
                'sometimes', 'string', 'max:50',
                Rule::unique('roles', 'name')->where($this->teamKey(), $this->tid())->where('guard_name', 'web')->ignore($role->id),
            ],
            'permissions' => ['array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')],
        ]);

        if (isset($data['name'])) {
            $role->update(['name' => $data['name']]);
        }
        if (array_key_exists('permissions', $data)) {
            $role->syncPermissions($data['permissions']);
        }

        return $this->done($request, 'Role updated.', ['role' => $role->load('permissions:id,name')]);
    }
}
