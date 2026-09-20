<?php

use App\Http\Controllers\AssignmentSubmissionController;
use App\Http\Controllers\AudienceController;
use App\Http\Controllers\AutodmRuleController;
use App\Http\Controllers\AvailabilityExceptionController;
use App\Http\Controllers\BookController;
use App\Http\Controllers\BookFileController;
use App\Http\Controllers\BookingAvailabilityController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\BookingResponseController;
use App\Http\Controllers\BookingServiceController;
use App\Http\Controllers\CheckoutQuestionController;
use App\Http\Controllers\CouponController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\CourseEnrollmentController;
use App\Http\Controllers\CourseLessonController;
use App\Http\Controllers\CourseModuleController;
use App\Http\Controllers\CourseSectionController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\EventRegistrationController;
use App\Http\Controllers\KycController;
use App\Http\Controllers\LessonContentController;
use App\Http\Controllers\LiveClassController;
use App\Http\Controllers\LockedContentController;
use App\Http\Controllers\LockedContentFileController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PaymentAccountController;
use App\Http\Controllers\PaymentPageController;
use App\Http\Controllers\PaymentTransactionController;
use App\Http\Controllers\PayoutController;
use App\Http\Controllers\ProductAddonController;
use App\Http\Controllers\ProductsOverviewController;
use App\Http\Controllers\ProductCoverImageController;
use App\Http\Controllers\QuizAiGenerateController;
use App\Http\Controllers\QuizImportController;
use App\Http\Controllers\QuizQuestionController;
use App\Http\Controllers\ReferralController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\Settings\BillingController;
use App\Http\Controllers\Settings\NotificationPreferenceController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\StoreAnalyticsController;
use App\Http\Controllers\StoreAppearanceController;
use App\Http\Controllers\StoreController;
use App\Http\Controllers\StoreHeaderButtonController;
use App\Http\Controllers\StoreSettingsController;
use App\Http\Controllers\StoreSocialLinkController;
use App\Http\Controllers\SubAdminController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web routes  (Inertia pages + axios JSON endpoints)
|--------------------------------------------------------------------------
| Order zaroori hai: welcome/settings/auth pehle, phir dashboard, phir
| customer.php, phir public.php sabse LAST me (catch-all /{username}).
| Webhooks => routes/webhooks.php (bootstrap/app.php me alag register hota hai, CSRF/session ke bina).
*/

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/bindings.php';

/*
 | Product CRUD helper: Course/Event/Book/LockedContent/PaymentPage/Booking-session sab ek shape.
 */
$productCrud = function (string $prefix, string $controller, string $param, string $name, string $perm, array $only = ['index', 'store', 'edit', 'update', 'publish', 'duplicate', 'destroy']) {
    $base = "dashboard/{$prefix}";
    $seg = '{' . $param . '}';

    if (in_array('index', $only)) {
        Route::get($base, [$controller, 'index'])->name("{$name}.index")->middleware("perm:{$perm}.view");
    }
    if (in_array('store', $only)) {
        Route::post($base, [$controller, 'store'])->name("{$name}.store")->middleware("perm:{$perm}.edit");
    }
    if (in_array('edit', $only)) {
        Route::get("{$base}/{$seg}/edit", [$controller, 'edit'])->name("{$name}.edit")->middleware("perm:{$perm}.view");
    }
    if (in_array('update', $only)) {
        Route::put("{$base}/{$seg}", [$controller, 'update'])->name("{$name}.update")->middleware("perm:{$perm}.edit");
    }
    if (in_array('publish', $only)) {
        Route::post("{$base}/{$seg}/publish", [$controller, 'publish'])->name("{$name}.publish")->middleware("perm:{$perm}.edit");
    }
    if (in_array('duplicate', $only)) {
        Route::post("{$base}/{$seg}/duplicate", [$controller, 'duplicate'])->name("{$name}.duplicate")->middleware("perm:{$perm}.edit");
    }
    if (in_array('destroy', $only)) {
        Route::delete("{$base}/{$seg}", [$controller, 'destroy'])->name("{$name}.destroy")->middleware("perm:{$perm}.delete");
    }
};

Route::middleware(['auth', 'set.team.context'])->group(function () use ($productCrud) {

    // ---- 2. Dashboard home ----
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // ---- 2b. Unified Products catalog (cross-type browse/filter view) ----
    Route::get('dashboard/products', [ProductsOverviewController::class, 'index'])->name('products.index');

    // ---- 3. Store ----
    Route::prefix('dashboard/store')->group(function () {
        Route::get('/', [StoreController::class, 'edit'])->name('store.edit')->middleware('perm:store.view');
        Route::put('/', [StoreController::class, 'update'])->name('store.update')->middleware('perm:store.edit');

        Route::get('appearance', [StoreAppearanceController::class, 'edit'])->name('store.appearance.edit')->middleware('perm:store.edit');
        Route::put('appearance', [StoreAppearanceController::class, 'update'])->name('store.appearance.update')->middleware('perm:store.edit');

        Route::get('settings', [StoreSettingsController::class, 'edit'])->name('store.settings.edit')->middleware('perm:store.edit');
        Route::put('settings', [StoreSettingsController::class, 'update'])->name('store.settings.update')->middleware('perm:store.edit');

        Route::get('analytics', [StoreAnalyticsController::class, 'index'])->name('store.analytics')->middleware('perm:store.view');

        Route::post('header-buttons', [StoreHeaderButtonController::class, 'store'])->name('store.header-buttons.store')->middleware('perm:store.edit');
        Route::delete('header-buttons/{headerButton}', [StoreHeaderButtonController::class, 'destroy'])->name('store.header-buttons.destroy')->middleware('perm:store.edit');

        Route::put('social-links', [StoreSocialLinkController::class, 'update'])->name('store.social-links.update')->middleware('perm:store.edit');
    });

    // ---- 5. Payments ----
    Route::prefix('dashboard/payments')->group(function () {
        Route::get('/', [PaymentTransactionController::class, 'index'])->name('payments.index')->middleware('perm:payments.view');
        Route::get('export', [PaymentTransactionController::class, 'export'])->name('payments.export')->middleware('perm:payments.view');
        Route::get('account', [PaymentAccountController::class, 'edit'])->name('payments.account')->middleware('perm:payments.view');
        Route::put('account/profile', [PaymentAccountController::class, 'updateProfile'])->name('payments.account.profile')->middleware('perm:payments.edit');
        Route::put('account/payout-method', [PaymentAccountController::class, 'updatePayoutMethod'])->name('payments.account.payout-method')->middleware('perm:payments.edit');
        Route::get('account/kyc', [KycController::class, 'edit'])->name('kyc.edit')->middleware('perm:payments.view');
        Route::post('account/kyc', [KycController::class, 'submit'])->name('kyc.submit')->middleware('perm:payments.edit');
    });

    // ---- 6. Payouts ----
    Route::get('/dashboard/payouts', [PayoutController::class, 'index'])->name('payouts.index')->middleware('perm:payouts.view');
    Route::post('/dashboard/payouts', [PayoutController::class, 'store'])->name('payouts.store')->middleware('perm:payouts.request');

    // ---- 7. Audience & Refer-Earn ----
    Route::get('/dashboard/audience', [AudienceController::class, 'index'])->name('audience.index')->middleware('perm:audience.view');
    Route::get('/dashboard/audience/visitors', [AudienceController::class, 'visitors'])->name('audience.visitors')->middleware('perm:audience.view');
    Route::get('/dashboard/audience/export', [AudienceController::class, 'export'])->name('audience.export')->middleware('perm:audience.view');
    Route::get('/dashboard/refer-earn', [ReferralController::class, 'index'])->name('referral.index');

    // ---- 8. Sub-admins & roles (sirf owner creator) ----
    Route::middleware('owner')->prefix('dashboard')->group(function () {
        Route::get('sub-admins', [SubAdminController::class, 'index'])->name('sub-admins.index');
        Route::post('sub-admins', [SubAdminController::class, 'store'])->name('sub-admins.store');
        Route::post('sub-admins/{subAdmin}/resend', [SubAdminController::class, 'resend'])->name('sub-admins.resend');
        Route::put('sub-admins/{subAdmin}/role', [SubAdminController::class, 'updateRole'])->name('sub-admins.role');
        Route::delete('sub-admins/{subAdmin}', [SubAdminController::class, 'revoke'])->name('sub-admins.revoke');

        Route::get('roles', [RoleController::class, 'index'])->name('roles.index');
        Route::post('roles', [RoleController::class, 'store'])->name('roles.store');
        Route::put('roles/{role}', [RoleController::class, 'update'])->name('roles.update');
    });

    // ---- 9. Courses ----
    $productCrud('courses', CourseController::class, 'course', 'courses', 'courses');

    Route::prefix('dashboard')->middleware('perm:courses.edit')->group(function () {
        // modules
        Route::post('courses/{course}/modules', [CourseModuleController::class, 'store'])->name('modules.store');
        Route::post('modules/reorder', [CourseModuleController::class, 'reorder'])->name('modules.reorder');
        Route::put('modules/{module}', [CourseModuleController::class, 'update'])->name('modules.update');
        Route::delete('modules/{module}', [CourseModuleController::class, 'destroy'])->name('modules.destroy');

        // lessons
        Route::post('modules/{module}/lessons', [CourseLessonController::class, 'store'])->name('lessons.store');
        Route::post('lessons/reorder', [CourseLessonController::class, 'reorder'])->name('lessons.reorder');
        Route::put('lessons/{lesson}', [CourseLessonController::class, 'update'])->name('lessons.update');
        Route::delete('lessons/{lesson}', [CourseLessonController::class, 'destroy'])->name('lessons.destroy');
        // NOTE: file upload wale content form ko POST + `_method=PUT` bhejo (PHP multipart PUT parse nahi karta)
        Route::put('lessons/{lesson}/content', [LessonContentController::class, 'update'])->name('lessons.content.update');

        // quiz
        Route::post('lessons/{lesson}/quiz/questions', [QuizQuestionController::class, 'store'])->name('quiz.questions.store');
        Route::put('quiz-questions/{quizQuestion}', [QuizQuestionController::class, 'update'])->name('quiz.questions.update');
        Route::delete('quiz-questions/{quizQuestion}', [QuizQuestionController::class, 'destroy'])->name('quiz.questions.destroy');
        Route::post('lessons/{lesson}/quiz/import', [QuizImportController::class, 'import'])->name('quiz.import');
        Route::post('lessons/{lesson}/quiz/ai-generate', [QuizAiGenerateController::class, 'generate'])->name('quiz.ai-generate')->middleware('throttle:10,1');

        // live classes
        Route::post('courses/{course}/live-classes', [LiveClassController::class, 'store'])->name('live-classes.store');
        Route::put('live-classes/{liveClass}', [LiveClassController::class, 'update'])->name('live-classes.update');
        Route::delete('live-classes/{liveClass}', [LiveClassController::class, 'destroy'])->name('live-classes.destroy');

        // course page sections (generic)
        Route::put('courses/{course}/sections/{type}', [CourseSectionController::class, 'update'])
            ->whereIn('type', ['instructions', 'benefits', 'faqs', 'testimonials', 'highlights', 'gallery'])
            ->name('course-sections.update');

        // grading
        Route::put('assignments/submissions/{submission}/grade', [AssignmentSubmissionController::class, 'grade'])->name('submissions.grade');
    });

    Route::prefix('dashboard')->middleware('perm:courses.view')->group(function () {
        Route::get('courses/{course}/students', [CourseEnrollmentController::class, 'index'])->name('enrollments.index');
        Route::get('enrollments/{enrollment}', [CourseEnrollmentController::class, 'show'])->name('enrollments.show');
        Route::get('assignments/submissions', [AssignmentSubmissionController::class, 'index'])->name('submissions.index');
        Route::get('assignments/submissions/{submission}/file', [AssignmentSubmissionController::class, 'file'])->name('submissions.file');
    });

    // ---- 10. Events / Books / Locked content / Payment pages ----
    $productCrud('events', EventController::class, 'event', 'events', 'events');
    $productCrud('books', BookController::class, 'book', 'books', 'books');
    $productCrud('locked-content', LockedContentController::class, 'lockedContent', 'locked-content', 'locked-content');
    $productCrud('payment-pages', PaymentPageController::class, 'paymentPage', 'payment-pages', 'payment-pages');

    Route::prefix('dashboard')->group(function () {
        Route::get('events/{event}/attendees', [EventRegistrationController::class, 'index'])->name('events.attendees')->middleware('perm:events.view');
        Route::put('event-registrations/{registration}', [EventRegistrationController::class, 'update'])->name('events.attendees.update')->middleware('perm:events.edit');

        Route::post('books/{book}/file', [BookFileController::class, 'upload'])->name('books.file')->middleware('perm:books.edit');

        Route::post('locked-content/{lockedContent}/files', [LockedContentFileController::class, 'store'])->name('locked-content.files.store')->middleware('perm:locked-content.edit');
        Route::delete('locked-content-files/{lockedContentFile}', [LockedContentFileController::class, 'destroy'])->name('locked-content.files.destroy')->middleware('perm:locked-content.edit');
        Route::post('locked-content/{lockedContent}/images', [LockedContentFileController::class, 'storeImage'])->name('locked-content.images.store')->middleware('perm:locked-content.edit');
        Route::delete('locked-content-images/{lockedContentImage}', [LockedContentFileController::class, 'destroyImage'])->name('locked-content.images.destroy')->middleware('perm:locked-content.edit');
    });

    // Shared nested resources (saare product types) — permission: kisi bhi product module ka edit
    Route::prefix('dashboard')
        ->middleware('perm:courses.edit,events.edit,books.edit,locked-content.edit,payment-pages.edit,bookings.edit')
        ->group(function () {
            Route::post('products/{product}/coupons', [CouponController::class, 'store'])->name('coupons.store');
            Route::put('coupons/{coupon}', [CouponController::class, 'update'])->name('coupons.update');
            Route::delete('coupons/{coupon}', [CouponController::class, 'destroy'])->name('coupons.destroy');

            Route::post('products/{product}/checkout-questions', [CheckoutQuestionController::class, 'store'])->name('checkout-questions.store');
            Route::put('checkout-questions/{checkoutQuestion}', [CheckoutQuestionController::class, 'update'])->name('checkout-questions.update');
            Route::delete('checkout-questions/{checkoutQuestion}', [CheckoutQuestionController::class, 'destroy'])->name('checkout-questions.destroy');

            Route::post('products/{product}/addons', [ProductAddonController::class, 'store'])->name('addons.store');
            Route::delete('product-addons/{addon}', [ProductAddonController::class, 'destroy'])->name('addons.destroy');

            Route::post('products/{product}/cover-images', [ProductCoverImageController::class, 'store'])->name('cover-images.store');
            Route::delete('cover-images/{coverImage}', [ProductCoverImageController::class, 'destroy'])->name('cover-images.destroy');
        });

    // ---- 11. Bookings (dashboard) ----
    Route::prefix('dashboard/bookings')->group(function () use ($productCrud) {
        Route::get('/', [BookingController::class, 'index'])->name('bookings.index')->middleware('perm:bookings.view');
        Route::get('responses', [BookingResponseController::class, 'index'])->name('booking-responses.index')->middleware('perm:bookings.view');
        Route::get('settings', [BookingAvailabilityController::class, 'edit'])->name('availability.edit')->middleware('perm:bookings.view');
        Route::put('settings/availability', [BookingAvailabilityController::class, 'update'])->name('availability.update')->middleware('perm:bookings.edit');
        Route::post('settings/exceptions', [AvailabilityExceptionController::class, 'store'])->name('availability.exceptions.store')->middleware('perm:bookings.edit');
        Route::delete('exceptions/{exception}', [AvailabilityExceptionController::class, 'destroy'])->name('availability.exceptions.destroy')->middleware('perm:bookings.edit');
        Route::put('{booking}/status', [BookingController::class, 'updateStatus'])->name('bookings.status')->middleware('perm:bookings.edit')->whereNumber('booking');
    });
    // Sessions tab (products of type=booking) => /dashboard/bookings/sessions...
    $productCrud('bookings/sessions', BookingServiceController::class, 'service', 'booking-services', 'bookings',
        ['index', 'store', 'update', 'duplicate', 'destroy']);

    // ---- 12. AutoDM ----
    Route::get('/dashboard/autodm', [AutodmRuleController::class, 'index'])->name('autodm.index')->middleware('perm:autodm.view');
    Route::post('/dashboard/autodm', [AutodmRuleController::class, 'store'])->name('autodm.store')->middleware('perm:autodm.edit');
    Route::put('/dashboard/autodm/{rule}', [AutodmRuleController::class, 'update'])->name('autodm.update')->middleware('perm:autodm.edit');
    Route::delete('/dashboard/autodm/{rule}', [AutodmRuleController::class, 'destroy'])->name('autodm.destroy')->middleware('perm:autodm.delete');

    // ---- 15. Account settings ----
    Route::prefix('dashboard/settings')->group(function () {
        Route::get('profile', [ProfileController::class, 'edit'])->name('settings.profile');
        Route::put('profile', [ProfileController::class, 'update'])->name('settings.profile.update');

        Route::middleware('owner')->group(function () {
            Route::get('billing', [BillingController::class, 'edit'])->name('settings.billing');
            Route::post('billing/upgrade', [BillingController::class, 'upgrade'])->name('settings.billing.upgrade');
        });

        Route::get('notifications', [NotificationPreferenceController::class, 'edit'])->name('settings.notifications');
        Route::put('notifications', [NotificationPreferenceController::class, 'update'])->name('settings.notifications.update');
    });
});

// ---- Customer portal (auth:customer) & Public storefront (guest) ----
require __DIR__ . '/customer.php';
require __DIR__ . '/public.php';   // <-- hamesha sabse last (catch-all /{username})
