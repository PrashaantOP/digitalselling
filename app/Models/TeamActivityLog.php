<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Team ke badlaav (invite, remove, role change, sign-in) — creator ke Team page pe dikhte hain. Route me kabhi nahi jaata. */
class TeamActivityLog extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'team_activity_logs';

    protected $fillable = ['creator_id', 'actor_user_id', 'action', 'subject', 'meta', 'ip'];

    protected $casts = ['meta' => 'array', 'created_at' => 'datetime'];

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }
}
