<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesUploads;
use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\FeedbackReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/** Dashboard → Bug report / feature request. Store ka har member bhej sakta hai aur store ki saari reports dekh sakta hai. */
class FeedbackController extends Controller
{
    use HandlesUploads, RespondsFlexibly;

    public function index()
    {
        $reports = FeedbackReport::where('creator_id', $this->tid())->with('user:id,name')->latest('id')->limit(50)->get()
            ->map(fn (FeedbackReport $r) => [
                'uuid' => $r->uuid,
                'type' => $r->type,
                'title' => $r->title,
                'details' => $r->details,
                'status' => $r->status,
                'admin_note' => $r->admin_note,
                'by' => $r->user?->name,
                'has_screenshot' => (bool) $r->screenshot_path,
                'created_at' => $r->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Feedback/Index', ['reports' => $reports]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(array_keys(FeedbackReport::TYPES))],
            'title' => ['required', 'string', 'max:150'],
            'details' => ['required', 'string', 'min:10', 'max:5000'],
            'page_url' => ['nullable', 'string', 'max:500'],
            'screenshot' => ['nullable', 'image', 'max:5120'],
        ]);

        FeedbackReport::create([
            'user_id' => $request->user()->id,
            'creator_id' => $this->tid(),
            'type' => $data['type'],
            'title' => trim($data['title']),
            'details' => trim($data['details']),
            'page_url' => $data['page_url'] ?? null,
            'screenshot_path' => $request->hasFile('screenshot') ? $this->putPrivate($request->file('screenshot'), 'feedback') : null,
        ]);

        return back()->with('success', $data['type'] === 'bug' ? 'Thanks — we got your bug report.' : 'Thanks — we got your idea.');
    }

    /** Apni report ka screenshot — sirf isi store ke log. */
    public function screenshot(string $reportUuid)
    {
        $report = FeedbackReport::where('creator_id', $this->tid())->where('uuid', $reportUuid)->firstOrFail();
        abort_unless($report->screenshot_path && Storage::disk('local')->exists($report->screenshot_path), 404);

        return Storage::disk('local')->response($report->screenshot_path);
    }
}
