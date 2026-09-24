<?php

/**
 * Creator-scoped route model bindings (SECURITY).
 * Koi bhi creator/sub-admin URL me dusre creator ka id daal ke uska data access nahi kar sakta —
 * har binding current tenant (Tenant::id()) ke andar hi record dhoondhti hai, warna 404.
 *
 * NOTE: customer routes (routes/customer.php) me jaan-bujh ke *Id naam ke plain params use hue hain
 * (enrollmentId, lessonId ...) taaki ye dashboard bindings unpar apply na hon.
 */

use App\Models\AssignmentSubmission;
use App\Models\AutodmRule;
use App\Models\AvailabilityException;
use App\Models\Booking;
use App\Models\CheckoutQuestion;
use App\Models\Coupon;
use App\Models\CourseLesson;
use App\Models\CourseModule;
use App\Models\Enrollment;
use App\Models\EventRegistration;
use App\Models\LiveClass;
use App\Models\LockedContentFile;
use App\Models\LockedContentImage;
use App\Models\Product;
use App\Models\ProductAddon;
use App\Models\ProductCoverImage;
use App\Models\QuizQuestion;
use App\Models\StoreHeaderButton;
use App\Models\SubAdmin;
use App\Support\Tenant;
use Illuminate\Support\Facades\Route;
use Spatie\Permission\Models\Role;

// ---- Products (type-wise) ----
$product = fn (?string $type, ?string $column = null) => function ($value) use ($type, $column) {
    $q = Product::where('creator_id', Tenant::id())
        ->when($type, fn ($q) => $q->where('type', $type));

    // uuid wale types (event/course/book/locked_content) guess-proof URLs dete hain, baaki id par hain
    if ($column === 'uuid') {
        return $q->where('uuid', $value)->firstOrFail();
    }

    return $q->findOrFail($value);
};

Route::bind('product', $product(null));
Route::bind('course', $product('course', 'uuid'));
Route::bind('event', fn ($value) => Product::where('creator_id', Tenant::id())->where('type', 'event')->where('uuid', $value)->firstOrFail());
Route::bind('book', $product('book', 'uuid'));
Route::bind('lockedContent', $product('locked_content', 'uuid'));
Route::bind('paymentPage', $product('payment_page'));
Route::bind('service', $product('booking'));

// ---- Product children ----
$ownedByProduct = fn (string $model) => fn ($value) => $model::whereHas('product', fn ($q) => $q->where('creator_id', Tenant::id()))->findOrFail($value);

Route::bind('coupon', $ownedByProduct(Coupon::class));
Route::bind('checkoutQuestion', $ownedByProduct(CheckoutQuestion::class));
Route::bind('addon', $ownedByProduct(ProductAddon::class));
Route::bind('coverImage', $ownedByProduct(ProductCoverImage::class));

// ---- Course tree ----
Route::bind('module', fn ($v) => CourseModule::whereHas('course.product', fn ($q) => $q->where('creator_id', Tenant::id()))->findOrFail($v));
Route::bind('lesson', fn ($v) => CourseLesson::whereHas('module.course.product', fn ($q) => $q->where('creator_id', Tenant::id()))->findOrFail($v));
Route::bind('quizQuestion', fn ($v) => QuizQuestion::whereHas('quiz.lesson.module.course.product', fn ($q) => $q->where('creator_id', Tenant::id()))->findOrFail($v));
Route::bind('liveClass', fn ($v) => LiveClass::whereHas('course.product', fn ($q) => $q->where('creator_id', Tenant::id()))->findOrFail($v));
Route::bind('enrollment', fn ($v) => Enrollment::whereHas('course.product', fn ($q) => $q->where('creator_id', Tenant::id()))->findOrFail($v));
Route::bind('registration', fn ($v) => EventRegistration::whereHas('event.product', fn ($q) => $q->where('creator_id', Tenant::id()))->findOrFail($v));
Route::bind('submission', fn ($v) => AssignmentSubmission::whereHas('enrollment.course.product', fn ($q) => $q->where('creator_id', Tenant::id()))->findOrFail($v));

// ---- Misc ----
Route::bind('lockedContentFile', fn ($v) => LockedContentFile::whereHas('lockedContent.product', fn ($q) => $q->where('creator_id', Tenant::id()))->findOrFail($v));
Route::bind('lockedContentImage', fn ($v) => LockedContentImage::whereHas('lockedContent.product', fn ($q) => $q->where('creator_id', Tenant::id()))->findOrFail($v));
Route::bind('headerButton', fn ($v) => StoreHeaderButton::whereHas('store', fn ($q) => $q->where('user_id', Tenant::id()))->findOrFail($v));
Route::bind('exception', fn ($v) => AvailabilityException::where('user_id', Tenant::id())->findOrFail($v));
Route::bind('rule', fn ($v) => AutodmRule::where('user_id', Tenant::id())->findOrFail($v));
Route::bind('subAdmin', fn ($v) => SubAdmin::where('creator_id', Tenant::id())->findOrFail($v));
Route::bind('booking', fn ($v) => Booking::where('creator_id', Tenant::id())->findOrFail($v));
Route::bind('role', fn ($v) => Role::where(config('permission.column_names.team_foreign_key', 'team_id'), Tenant::id())->findOrFail($v));

// ---- Public checkout: sirf published product ----
Route::bind('checkoutProduct', fn ($v) => Product::where('status', 'published')->findOrFail($v));
