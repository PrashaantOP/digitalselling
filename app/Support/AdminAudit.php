<?php

namespace App\Support;

use App\Models\Admin;
use App\Models\AdminAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * Har admin action ka record. Panel se ho to logged-in admin, artisan se ho to admin_id null ("CLI").
 * Actions dot-naam se: kyc.approved, settlement.marked_paid, creator.suspended, admin.login …
 */
class AdminAudit
{
    public static function log(string $action, ?Model $subject = null, array $meta = [], ?Admin $admin = null): AdminAuditLog
    {
        $request = app()->runningInConsole() && ! app()->runningUnitTests() ? null : request();
        $admin ??= Auth::guard('admin')->user();

        return AdminAuditLog::create([
            'admin_id' => $admin?->id,
            'action' => $action,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'meta' => $meta ?: null,
            'ip' => $request?->ip(),
            'user_agent' => $request ? substr((string) $request->userAgent(), 0, 255) : 'cli',
        ]);
    }
}
