<?php

namespace App\Support;

use App\Models\TeamActivityLog;
use App\Models\User;

/** member.invited, invite.resent, invite.cancelled, member.joined, member.removed, member.role_changed, role.*, member.signed_in */
class TeamActivity
{
    public static function log(int $creatorId, string $action, ?string $subject = null, array $meta = [], ?User $actor = null): void
    {
        $request = app()->runningInConsole() && ! app()->runningUnitTests() ? null : request();

        TeamActivityLog::create([
            'creator_id' => $creatorId,
            'actor_user_id' => ($actor ?? auth('web')->user())?->id,
            'action' => $action,
            'subject' => $subject,
            'meta' => $meta ?: null,
            'ip' => $request?->ip(),
        ]);
    }
}
