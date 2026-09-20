<?php

namespace App\Http\Controllers\Customer;

use App\Models\Customer;
use App\Models\Enrollment;
use Illuminate\Support\Collection;

/**
 * `customers` table per-creator hai (unique: creator_id + phone), yaani ek insaan ke alag creators ke
 * liye alag rows ho sakte hain. Portal me "meri saari cheezein" dikhane ke liye hum ek hi phone ke
 * saare customer rows ke ids use karte hain.
 */
trait ResolvesCustomer
{
    protected function me(): Customer
    {
        return auth('customer')->user();
    }

    protected function customerIds(): Collection
    {
        return Customer::where('phone', $this->me()->phone)->pluck('id');
    }

    /** Course ke liye valid (expire nahi hua) enrollment, warna 404/403. */
    protected function enrollmentForCourse(int $courseDetailId): Enrollment
    {
        $enrollment = Enrollment::where('course_id', $courseDetailId)->whereIn('customer_id', $this->customerIds())->firstOrFail();

        abort_if($enrollment->access_expires_at && $enrollment->access_expires_at->isPast(), 403, 'Your access to this course has expired.');

        return $enrollment;
    }
}
