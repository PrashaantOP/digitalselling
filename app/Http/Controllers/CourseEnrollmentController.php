<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CourseEnrollmentController extends Controller
{
    public function index(Request $request, Product $course)
    {
        $enrollments = Enrollment::with('customer:id,name,email,phone')
            ->where('course_id', $course->courseDetail->id)
            ->when($request->query('search'), fn ($q, $v) => $q->whereHas('customer', fn ($c) => $c
                ->where('name', 'like', "%{$v}%")->orWhere('email', 'like', "%{$v}%")->orWhere('phone', 'like', "%{$v}%")))
            ->latest('created_at')->paginate(20)->withQueryString();

        return Inertia::render('Courses/Students', [
            'course' => $course->only(['id', 'title', 'slug']),
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
            'course.product:id,title',
            'course.modules' => fn ($q) => $q->orderBy('sort_order'),
            'course.modules.lessons' => fn ($q) => $q->orderBy('sort_order'),
        ]);

        return Inertia::render('Courses/EnrollmentShow', ['enrollment' => $enrollment]);
    }
}
