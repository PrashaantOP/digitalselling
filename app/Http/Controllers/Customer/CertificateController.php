<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Services\CertificateService;

class CertificateController extends Controller
{
    use ResolvesCustomer;

    /**
     * GET /me/certificates/{certificateUuid}
     * Printable page (invoices jaisa) — browser ke "Save as PDF" se download. Design creator ka hota hai;
     * radd certificate bhi khulta hai par "REVOKED" watermark ke saath.
     */
    public function download(string $certificateUuid, CertificateService $certificates)
    {
        $certificate = Certificate::whereHas('enrollment', fn ($q) => $q->whereIn('customer_id', $this->customerIds()))
            ->where('uuid', $certificateUuid)->firstOrFail();

        return response()->view('certificates.show', $certificates->viewData($certificate));
    }
}
