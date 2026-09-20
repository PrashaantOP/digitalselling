<?php

namespace App\Support;

use App\Models\User;

/**
 * Current "creator context".
 *  - creator   -> own id
 *  - sub_admin -> parent_creator_id
 * Har dashboard query is id se scope hoti hai (multi-tenancy).
 */
class Tenant
{
    public static function id(): ?int
    {
        $user = auth()->user();

        if (! $user) {
            return null;
        }

        return $user->isSubAdmin() ? (int) $user->parent_creator_id : (int) $user->id;
    }

    public static function creator(): User
    {
        return User::findOrFail(self::id());
    }
}
