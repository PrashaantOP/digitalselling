<?php

/**
 * Creator-scoped route model bindings (SECURITY).
 *
 * 1. URL me kabhi numeric id nahi jaati — har param record ka `uuid` hai (models me HasUuid).
 *    Numeric id daalo to route match hi nahi hota (neeche Route::pattern), seedha 404.
 * 2. Koi bhi creator/sub-admin dusre creator ka uuid daal ke uska data access nahi kar sakta —
 *    har binding current tenant (Tenant::id()) ke andar hi record dhoondhti hai, warna 404.
 *
 * Naya routed param jodo to yahan binding + $uuidParams me naam, aur tests/Feature/RouteKeysTest.php
 * ka allowlist update karo.
 *
 * NOTE: customer routes (routes/customer.php) me jaan-bujh ke *Uuid naam ke plain params use hue hain
 * (enrollmentUuid, lessonUuid ...) taaki ye dashboard bindings unpar apply na hon.
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
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductAddon;
use App\Models\ProductCoverImage;
use App\Models\QuizQuestion;
use App\Models\Role;
use App\Models\Settlement;
use App\Models\StoreHeaderButton;
use App\Models\SubAdmin;
use App\Support\Tenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Route;

/** Har binding yahi karti hai: tenant-scoped query me uuid se record, warna 404. */
$byUuid = fn (Builder $query, string $value) => $query->where('uuid', $value)->firstOrFail();

// ---- Products (type-wise) ----
$product = fn (?string $type) => fn ($value) => $byUuid(
    Product::where('creator_id', Tenant::id())->when($type, fn ($q) => $q->where('type', $type)),
    $value,
);

Route::bind('product', $product(null));
Route::bind('course', $product('course'));
Route::bind('event', $product('event'));
Route::bind('book', $product('book'));
Route::bind('lockedContent', $product('locked_content'));
Route::bind('paymentPage', $product('payment_page'));
Route::bind('service', $product('booking'));

// ---- Product children ----
$ownedByProduct = fn (string $model) => fn ($value) => $byUuid($model::whereHas('product', fn ($q) => $q->where('creator_id', Tenant::id())), $value);

Route::bind('coupon', $ownedByProduct(Coupon::class));
Route::bind('checkoutQuestion', $ownedByProduct(CheckoutQuestion::class));
Route::bind('addon', $ownedByProduct(ProductAddon::class));
Route::bind('coverImage', $ownedByProduct(ProductCoverImage::class));

// ---- Course tree ----
Route::bind('module', fn ($v) => $byUuid(CourseModule::whereHas('course.product', fn ($q) => $q->where('creator_id', Tenant::id())), $v));
Route::bind('lesson', fn ($v) => $byUuid(CourseLesson::whereHas('module.course.product', fn ($q) => $q->where('creator_id', Tenant::id())), $v));
Route::bind('quizQuestion', fn ($v) => $byUuid(QuizQuestion::whereHas('quiz.lesson.module.course.product', fn ($q) => $q->where('creator_id', Tenant::id())), $v));
Route::bind('liveClass', fn ($v) => $byUuid(LiveClass::whereHas('course.product', fn ($q) => $q->where('creator_id', Tenant::id())), $v));
Route::bind('enrollment', fn ($v) => $byUuid(Enrollment::whereHas('course.product', fn ($q) => $q->where('creator_id', Tenant::id())), $v));
Route::bind('registration', fn ($v) => $byUuid(EventRegistration::whereHas('event.product', fn ($q) => $q->where('creator_id', Tenant::id())), $v));
Route::bind('submission', fn ($v) => $byUuid(AssignmentSubmission::whereHas('enrollment.course.product', fn ($q) => $q->where('creator_id', Tenant::id())), $v));

// ---- Misc ----
Route::bind('lockedContentFile', fn ($v) => $byUuid(LockedContentFile::whereHas('lockedContent.product', fn ($q) => $q->where('creator_id', Tenant::id())), $v));
Route::bind('lockedContentImage', fn ($v) => $byUuid(LockedContentImage::whereHas('lockedContent.product', fn ($q) => $q->where('creator_id', Tenant::id())), $v));
Route::bind('headerButton', fn ($v) => $byUuid(StoreHeaderButton::whereHas('store', fn ($q) => $q->where('user_id', Tenant::id())), $v));
Route::bind('exception', fn ($v) => $byUuid(AvailabilityException::where('user_id', Tenant::id()), $v));
Route::bind('rule', fn ($v) => $byUuid(AutodmRule::where('user_id', Tenant::id()), $v));
Route::bind('subAdmin', fn ($v) => $byUuid(SubAdmin::where('creator_id', Tenant::id()), $v));
Route::bind('booking', fn ($v) => $byUuid(Booking::where('creator_id', Tenant::id()), $v));
Route::bind('settlement', fn ($v) => $byUuid(Settlement::where('creator_id', Tenant::id()), $v));
Route::bind('order', fn ($v) => $byUuid(Order::where('creator_id', Tenant::id()), $v));
Route::bind('role', fn ($v) => $byUuid(Role::where(config('permission.column_names.team_foreign_key', 'team_id'), Tenant::id()), $v));

// ---- Public checkout: sirf published product ----
Route::bind('checkoutProduct', fn ($v) => $byUuid(
    Product::where('status', 'published')->whereHas('creator', fn ($q) => $q->where('status', 'active')),
    $v,
));

// ---- Numeric id ab route match hi nahi karega ----
$uuidParams = [
    'product', 'course', 'courseUuid', 'event', 'book', 'lockedContent', 'paymentPage', 'service',
    'coupon', 'checkoutQuestion', 'addon', 'coverImage',
    'module', 'lesson', 'quizQuestion', 'liveClass', 'enrollment', 'registration', 'submission',
    'lockedContentFile', 'lockedContentImage', 'headerButton', 'exception', 'rule', 'subAdmin',
    'booking', 'settlement', 'order', 'role', 'checkoutProduct',
    // customer (routes/customer.php) — controllers khud uuid se dhoondhte hain
    'enrollmentUuid', 'lessonUuid', 'fileUuid', 'quizUuid', 'assignmentUuid', 'certificateUuid', 'bookUuid',
];

foreach ($uuidParams as $param) {
    Route::pattern($param, '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}');
}
