<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FeedbackReport;
use App\Support\AdminAudit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/** Admin → Feedback: creators ke bug reports / feature requests — padho, status badlo, jawab likho. */
class FeedbackController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in([...array_keys(FeedbackReport::STATUSES), 'all'])],
            'type' => ['nullable', Rule::in(array_keys(FeedbackReport::TYPES))],
        ]);
        $status = $filters['status'] ?? 'open';

        $items = FeedbackReport::query()
            ->with(['user:id,name,email', 'creator:id,uuid,name,email'])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($filters['type'] ?? null, fn ($q, $v) => $q->where('type', $v))
            ->latest('id')
            ->paginate(25)->withQueryString()
            ->through(fn (FeedbackReport $r) => [
                'uuid' => $r->uuid,
                'type' => $r->type,
                'title' => $r->title,
                'details' => $r->details,
                'page_url' => $r->page_url,
                'status' => $r->status,
                'admin_note' => $r->admin_note,
                'screenshot_url' => $r->screenshot_path ? url("/admin/feedback/{$r->uuid}/screenshot") : null,
                'by' => $r->user?->only(['name', 'email']),
                'creator' => $r->creator?->only(['uuid', 'name', 'email']),
                'created_at' => $r->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Admin/Feedback/Index', [
            'items' => $items,
            'filters' => ['status' => $status, 'type' => $filters['type'] ?? null],
            'openCount' => FeedbackReport::where('status', 'open')->count(),
        ]);
    }

    public function update(Request $request, FeedbackReport $adminFeedback): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(array_keys(FeedbackReport::STATUSES))],
            'admin_note' => ['nullable', 'string', 'max:2000'],
        ]);

        $adminFeedback->update($data);
        AdminAudit::log('feedback.updated', $adminFeedback, ['status' => $data['status']]);

        return back()->with('status', 'Report updated.');
    }

    public function screenshot(FeedbackReport $adminFeedback)
    {
        abort_unless($adminFeedback->screenshot_path && Storage::disk('local')->exists($adminFeedback->screenshot_path), 404);

        return Storage::disk('local')->response($adminFeedback->screenshot_path);
    }
}
