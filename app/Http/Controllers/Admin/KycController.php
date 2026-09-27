<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\KycVerification;
use App\Services\KycReviewService;
use App\Support\AdminAudit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class KycController extends Controller
{
    public function __construct(private KycReviewService $review) {}

    public function index(Request $request)
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(['pending', 'verified', 'rejected', 'all'])],
            'q' => ['nullable', 'string', 'max:100'],
        ]);
        $status = $filters['status'] ?? 'pending';

        $items = KycVerification::query()
            ->with('user:id,uuid,name,email,username')
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($filters['q'] ?? null, fn ($q, $v) => $q->where(fn ($s) => $s
                ->where('legal_name', 'like', "%{$v}%")
                ->orWhereHas('user', fn ($u) => $u->where('email', 'like', "%{$v}%")->orWhere('name', 'like', "%{$v}%"))))
            // pending me sabse purana pehle (FIFO), baaki me naya pehle
            ->when($status === 'pending', fn ($q) => $q->oldest('submitted_at'), fn ($q) => $q->latest('updated_at'))
            ->paginate(25)->withQueryString()
            ->through(fn (KycVerification $k) => [
                'uuid' => $k->uuid,
                'status' => $k->status,
                'legal_name' => $k->legal_name,
                'submitted_at' => $k->submitted_at?->toIso8601String(),
                'creator' => $k->user?->only(['uuid', 'name', 'email', 'username']),
            ]);

        return Inertia::render('Admin/Kyc/Index', ['items' => $items, 'filters' => ['status' => $status, 'q' => $filters['q'] ?? null]]);
    }

    /** Admin ko poori details dikhti hain (creator ko masked) — isliye ye page khud audit hota hai. */
    public function show(KycVerification $kyc)
    {
        $kyc->load('user:id,uuid,name,email,username,phone');
        AdminAudit::log('kyc.viewed', $kyc);

        return Inertia::render('Admin/Kyc/Show', [
            'kyc' => $kyc->only(['uuid', 'status', 'legal_name', 'pan_number', 'gst_number', 'bank_account_holder', 'bank_account_number', 'ifsc', 'rejection_reason'])
                + [
                    'submitted_at' => $kyc->submitted_at?->toIso8601String(),
                    'verified_at' => $kyc->verified_at?->toIso8601String(),
                    'has_document' => (bool) $kyc->id_document_path,
                    'document_is_pdf' => str_ends_with(strtolower((string) $kyc->id_document_path), '.pdf'),
                    'creator' => $kyc->user?->only(['uuid', 'name', 'email', 'username', 'phone']),
                ],
        ]);
    }

    /** ID document private disk pe hai — sirf yahin se, aur har view log hota hai. */
    public function document(KycVerification $kyc)
    {
        $path = $kyc->id_document_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        AdminAudit::log('kyc.document_viewed', $kyc);

        return Storage::disk('local')->response($path, 'kyc-' . $kyc->uuid . '.' . pathinfo($path, PATHINFO_EXTENSION), [
            'Cache-Control' => 'no-store, private',
            'Content-Disposition' => 'inline',
        ]);
    }

    public function approve(KycVerification $kyc): RedirectResponse
    {
        $this->review->approve($kyc);

        return redirect('/admin/kyc')->with('status', "KYC approved for {$kyc->legal_name}.");
    }

    public function reject(Request $request, KycVerification $kyc): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);
        $this->review->reject($kyc, $data['reason']);

        return redirect('/admin/kyc')->with('status', "KYC rejected for {$kyc->legal_name}.");
    }
}
