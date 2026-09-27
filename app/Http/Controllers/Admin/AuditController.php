<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\AdminAuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AuditController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'action' => ['nullable', 'string', 'max:60'],
            'admin' => ['nullable', 'uuid'],
        ]);

        $logs = AdminAuditLog::query()
            ->with('admin:id,uuid,name,email')
            // "kyc" → kyc.approved, kyc.rejected … sab
            ->when($filters['action'] ?? null, fn ($q, $v) => $q->where('action', 'like', "{$v}%"))
            ->when($filters['admin'] ?? null, fn ($q, $v) => $q->whereHas('admin', fn ($a) => $a->where('uuid', $v)))
            ->latest('id')
            ->paginate(50)->withQueryString()
            ->through(fn (AdminAuditLog $l) => [
                'id' => $l->id,
                'action' => $l->action,
                'admin' => $l->admin?->only(['uuid', 'name', 'email']),
                'subject' => $l->subject_type ? class_basename($l->subject_type) : null,
                'meta' => $l->meta,
                'ip' => $l->ip,
                'user_agent' => $l->user_agent,
                'created_at' => $l->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Admin/Audit/Index', [
            'logs' => $logs,
            'filters' => $filters,
            'admins' => Admin::orderBy('name')->get(['uuid', 'name']),
        ]);
    }
}
