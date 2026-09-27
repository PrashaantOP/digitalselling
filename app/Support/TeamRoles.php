<?php

namespace App\Support;

use App\Models\Role;
use App\Models\User;
use Spatie\Permission\PermissionRegistrar;

/** Har creator ki team me 4 ready-made roles — pehli baar Team/Roles page khulne pe ban jaate hain. */
class TeamRoles
{
    public static function ensureDefaults(User $creator): void
    {
        app(PermissionRegistrar::class)->setPermissionsTeamId($creator->id);

        foreach (TeamPermissions::TEMPLATES as $name => $template) {
            $exists = Role::where('team_id', $creator->id)->where('name', $name)->where('guard_name', 'web')->exists();

            if ($exists) {
                continue; // creator ne edit kiya ho to chhedo mat
            }

            $role = new Role;
            $role->forceFill(['name' => $name, 'guard_name' => 'web', 'team_id' => $creator->id, 'is_template' => true])->save();
            $role->syncPermissions($template['permissions']);
        }
    }
}
