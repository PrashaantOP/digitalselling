<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Public: /certificates aur /certificates/{certificateNumber} — koi bhi certificate number se uski asliyat
 * check kar sakta hai (employer, college…). Sirf snapshot naam/course/creator/date dikhte hain —
 * email, phone, order ya progress kabhi nahi.
 */
class CertificateVerifyController extends Controller
{
    public function index(Request $request)
    {
        $number = strtoupper(trim((string) $request->query('number', '')));

        // form submit: saaf URL pe bhej do taaki link share ho sake
        if ($number !== '' && preg_match('/^[A-Z0-9\-]{4,40}$/', $number)) {
            return redirect('/certificates/' . $number);
        }

        return Inertia::render('Public/CertificateVerify', ['number' => $number ?: null, 'result' => null]);
    }

    public function show(string $certificateNumber)
    {
        $number = strtoupper($certificateNumber);
        $certificate = Certificate::where('certificate_number', $number)->first();

        return Inertia::render('Public/CertificateVerify', [
            'number' => $number,
            // na mile to bhi 200 + wahi page — "is number ka koi certificate nahi" ek jawab hai, error nahi
            'result' => $certificate ? [
                'status' => $certificate->isRevoked() ? 'revoked' : 'valid',
                'student_name' => $certificate->student_name,
                'course_title' => $certificate->course_title,
                'creator_name' => $certificate->creator_name,
                'issued_at' => $certificate->issued_at,
                'revoked_at' => $certificate->revoked_at,
            ] : ['status' => 'not_found'],
        ]);
    }
}
