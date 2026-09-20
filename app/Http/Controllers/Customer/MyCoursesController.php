<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use Inertia\Inertia;

class MyCoursesController extends Controller
{
    use ResolvesCustomer;

    public function index()
    {
        $enrollments = Enrollment::with([
            'course.product:id,creator_id,title,slug',
            'course.product.coverImages:id,product_id,image_path,sort_order',
            'course.product.creator:id,name,username',
        ])
            ->whereIn('customer_id', $this->customerIds())
            ->latest('created_at')->get()
            ->map(fn (Enrollment $e) => [
                'id' => $e->id,
                'title' => $e->course->product->title,
                'creator' => $e->course->product->creator->only(['name', 'username']),
                'cover' => $e->course->product->coverImages->sortBy('sort_order')->first()?->image_path,
                'progress_percent' => $e->progress_percent,
                'completed_at' => $e->completed_at,
                'access_expires_at' => $e->access_expires_at,
                'expired' => (bool) ($e->access_expires_at && $e->access_expires_at->isPast()),
                'has_certificate' => (bool) $e->certificate_issued_at,
            ]);

        return Inertia::render('Customer/MyCourses', ['courses' => $enrollments]);
    }
}
