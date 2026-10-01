<?php

namespace App\Http\Controllers\Customer;

use App\Models\Buyer;
use App\Models\Customer;
use App\Models\Enrollment;
use Illuminate\Support\Collection;

/**
 * `customers` table per-creator hai — ek insaan ke alag creators ke liye alag rows. Portal me "meri saari
 * cheezein" dikhane ke liye logged-in buyer ke saare customer rows ke ids use hote hain.
 *
 * Jodna `buyer_id` se hota hai, phone se NAHI: checkout pe phone verify nahi hota, to phone se jodne pe
 * koi doosre ka number likh kar uski kharid dekh leta.
 */
trait ResolvesCustomer
{
    protected function me(): Buyer
    {
        return auth('customer')->user();
    }

    protected function customerIds(): Collection
    {
        return Customer::where('buyer_id', $this->me()->id)->pluck('id');
    }

    /** Course ke liye valid (expire nahi hua) enrollment, warna 404/403. */
    protected function enrollmentForCourse(int $courseDetailId): Enrollment
    {
        $enrollment = Enrollment::where('course_id', $courseDetailId)->whereIn('customer_id', $this->customerIds())->firstOrFail();

        abort_if($enrollment->access_expires_at && $enrollment->access_expires_at->isPast(), 403, 'Your access to this course has expired.');

        return $enrollment;
    }
}
