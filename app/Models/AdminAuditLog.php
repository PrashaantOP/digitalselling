<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminAuditLog extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'admin_audit_logs';

    protected $fillable = ['admin_id', 'action', 'subject_type', 'subject_id', 'meta', 'ip', 'user_agent'];

    protected $casts = ['meta' => 'array', 'created_at' => 'datetime'];

    public function admin()
    {
        return $this->belongsTo(Admin::class);
    }

    public function subject()
    {
        return $this->morphTo();
    }
}
