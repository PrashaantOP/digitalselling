<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\Product;
use App\Services\CertificateService;
use App\Support\Tenant;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CourseEnrollmentController extends Controller
{
    public function index(Request $request, string $courseUuid)
    {
        $course = Product::query()
            ->where('creator_id', Tenant::id())
            ->where('type', 'course')
            ->where('uuid', $courseUuid)
            ->firstOrFail();

        abort_unless($course->courseDetail, 404);

        $enrollments = Enrollment::with('customer:id,name,email,phone')
            ->where('course_id', $course->courseDetail->id)
            ->when($request->query('search'), fn($q, $v) => $q->whereHas('customer', fn($c) => $c
                ->where('name', 'like', "%{$v}%")->orWhere('email', 'like', "%{$v}%")->orWhere('phone', 'like', "%{$v}%")))
            ->latest('created_at')->paginate(20)->withQueryString();

        return Inertia::render('Courses/Students', [
            'course' => $course->only(['id', 'uuid', 'title', 'slug']),
            'enrollments' => $enrollments,
            'filters' => $request->only('search'),
        ]);
    }

    /** Ek student ka progress detail: lesson-wise completion, quiz scores, assignments, certificate. */
    public function show(Enrollment $enrollment)
    {
        $enrollment->load([
            'customer:id,name,email,phone',
            'order:id,order_number,total_amount,paid_at',
            'certificate',
            'lessonProgress:id,enrollment_id,lesson_id,is_completed,completed_at',
            'quizAttempts.quiz:id,lesson_id,title',
            'assignmentSubmissions.assignment:id,lesson_id',
            'course.product:id,uuid,title',
            'course.modules' => fn($q) => $q->orderBy('sort_order'),
            'course.modules.lessons' => fn($q) => $q->orderBy('sort_order'),
        ]);

        return Inertia::render('Courses/EnrollmentShow', ['enrollment' => $enrollment]);
    }

    /** Creator apne student ka certificate dekhe — wahi printable page jo student ko milta hai. */
    public function certificate(Enrollment $enrollment, CertificateService $certificates)
    {
        abort_unless($enrollment->certificate, 404);

        return response()->view('certificates.show', $certificates->viewData($enrollment->certificate));
    }

    /** Naam ki spelling sudhaarna — certificate ka snapshot hai, isliye student ke Account se nahi badalta. */
    public function renameCertificate(Request $request, Enrollment $enrollment, CertificateService $certificates)
    {
        abort_unless($enrollment->certificate, 404);
        $data = $request->validate(['student_name' => ['required', 'string', 'max:150']]);

        $certificates->rename($enrollment->certificate, $data['student_name']);

        return back()->with('success', 'Name on the certificate updated.');
    }

    /** Radd (jaise refund ke baad) — public verify page pe "revoked" dikhta hai. Wapas bhi laya ja sakta hai. */
    public function revokeCertificate(Request $request, Enrollment $enrollment, CertificateService $certificates)
    {
        abort_unless($enrollment->certificate, 404);
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);

        $certificates->revoke($enrollment->certificate, $data['reason']);

        return back()->with('success', 'Certificate revoked.');
    }

    public function restoreCertificate(Enrollment $enrollment, CertificateService $certificates)
    {
        abort_unless($enrollment->certificate, 404);

        $certificates->restore($enrollment->certificate);

        return back()->with('success', 'Certificate restored.');
    }
}
