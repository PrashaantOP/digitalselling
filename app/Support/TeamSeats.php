<?php

namespace App\Support;

use App\Models\SubAdmin;
use App\Models\User;

/** Team seats: Free 1, Pro 5 — pending invites bhi seat lete hain. Downgrade pe existing members chalte rehte hain. */
class TeamSeats
{
    public const LIMITS = ['free' => 1, 'pro' => 5];

    public static function limit(User $creator): int
    {
        return self::LIMITS[PlanPricing::effectivePlan($creator)] ?? 1;
    }

    public static function used(User $creator): int
    {
        return SubAdmin::where('creator_id', $creator->id)->live()->count();
    }

    public static function summary(User $creator): array
    {
        return ['used' => self::used($creator), 'limit' => self::limit($creator), 'plan' => PlanPricing::effectivePlan($creator)];
    }
}
