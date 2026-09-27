<?php

namespace App\Support;

use App\Models\User;

/**
 * "Kya ye user ye kar sakta hai?" — owner creator sab kuch, sub-admin sirf apne role ki permissions.
 * Spatie team context (SetTeamContext middleware) pehle se set hona chahiye.
 */
class TeamAccess
{
    public static function can(?User $user, string $permission): bool
    {
        if (! $user) {
            return false;
        }

        if ($user->isCreator()) {
            return true;
        }

        return $user->isSubAdmin() && self::permissions($user)->contains($permission);
    }

    /** Frontend ke liye: owner = ['*'], sub-admin = uski permissions. */
    public static function permissions(User $user)
    {
        if ($user->isCreator()) {
            return collect(['*']);
        }

        return once(fn () => $user->getAllPermissions()->pluck('name')->values());
    }
}
