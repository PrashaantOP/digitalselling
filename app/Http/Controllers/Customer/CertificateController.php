<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use Illuminate\Support\Facades\Storage;

class CertificateController extends Controller
{
    use ResolvesCustomer;

    /**
     * GET /me/certificates/{certificateId}
     * PDF pehli baar generate hoke storage me save hota hai. Iske liye:  composer require barryvdh/laravel-dompdf
     */
    public function download(int $certificateId)
    {
        $certificate = Certificate::with(['enrollment.customer', 'enrollment.course.product:id,title,creator_id', 'enrollment.course.product.creator:id,name'])
            ->whereHas('enrollment', fn ($q) => $q->whereIn('customer_id', $this->customerIds()))
            ->findOrFail($certificateId);

        if (! $certificate->file_path || ! Storage::disk('local')->exists($certificate->file_path)) {
            abort_unless(class_exists(\Barryvdh\DomPDF\Facade\Pdf::class), 501, 'Certificate PDF generation is not installed (barryvdh/laravel-dompdf).');

            $e = $certificate->enrollment;
            $html = view('certificates.default', [
                'studentName' => $e->customer->name ?: $e->customer->phone,
                'courseTitle' => $e->course->product->title,
                'creatorName' => $e->course->product->creator->name,
                'number' => $certificate->certificate_number,
                'issuedAt' => $certificate->issued_at,
            ])->render();

            $path = "certificates/{$certificate->certificate_number}.pdf";
            Storage::disk('local')->put($path, \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html)->setPaper('a4', 'landscape')->output());
            $certificate->update(['file_path' => $path]);
        }

        return Storage::disk('local')->download($certificate->file_path, "certificate-{$certificate->certificate_number}.pdf");
    }
}
