<?php

use App\Http\Controllers\Customer\AccountController;
use App\Http\Controllers\Customer\AssignmentSubmissionController;
use App\Http\Controllers\Customer\AuthController;
use App\Http\Controllers\Customer\BookDownloadController;
use App\Http\Controllers\Customer\CertificateController;
use App\Http\Controllers\Customer\CheckoutAccessController;
use App\Http\Controllers\Customer\LessonPlayerController;
use App\Http\Controllers\Customer\MyBookingsController;
use App\Http\Controllers\Customer\MyCoursesController;
use App\Http\Controllers\Customer\MyPurchasesController;
use App\Http\Controllers\Customer\QuizAttemptController;
use Illuminate\Support\Facades\Route;

/*
| Customer portal — `customer` guard (buyers table), OTP login (email hamesha, mobile sirf verified number pe).
| Params jaan-bujh ke *Uuid naam ke hain taaki dashboard ki creator-scoped bindings inpar apply na hon;
| har controller khud verify karta hai ki record isi buyer ka hai.
*/

// ---- Login (password nahi — sirf OTP) ----
Route::middleware('guest:customer')->prefix('me')->group(function () {
    Route::get('login', [AuthController::class, 'create'])->name('me.login');
    Route::post('login', [AuthController::class, 'store'])->middleware('throttle:login-ip');
    Route::get('login/verify', [AuthController::class, 'verifyForm'])->name('me.login.verify');
    Route::post('login/verify', [AuthController::class, 'verify'])->middleware('throttle:login-ip');
    Route::post('login/resend', [AuthController::class, 'resend'])->middleware('throttle:login-ip')->name('me.login.resend');
});

// ---- Pay ke turant baad: code daal kar seedha apni cheez tak (sirf wahi browser jisne order banaya) ----
Route::prefix('checkout/done/{orderUuid}')->group(function () {
    Route::get('/', [CheckoutAccessController::class, 'show'])->name('checkout.done');
    Route::post('code', [CheckoutAccessController::class, 'sendCode'])->middleware('throttle:login-ip')->name('checkout.done.code');
    Route::post('open', [CheckoutAccessController::class, 'open'])->middleware('throttle:login-ip')->name('checkout.done.open');
    Route::post('email', [CheckoutAccessController::class, 'fixEmail'])->middleware('throttle:10,1')->name('checkout.done.email');
});

Route::middleware('auth:customer')->prefix('me')->group(function () {
    Route::redirect('/', '/me/courses');
    Route::post('logout', [AuthController::class, 'destroy'])->name('me.logout');

    Route::get('courses', [MyCoursesController::class, 'index'])->name('me.courses');
    Route::get('courses/{enrollmentUuid}/learn/{lessonUuid?}', [LessonPlayerController::class, 'show'])->name('me.learn');
    Route::post('lessons/{lessonUuid}/complete', [LessonPlayerController::class, 'markComplete'])->name('me.lesson.complete');
    Route::get('lesson-files/{fileUuid}', [LessonPlayerController::class, 'noteFile'])->name('me.lesson.file');
    Route::get('lesson-files/{fileUuid}/view', [LessonPlayerController::class, 'viewNoteFile'])->name('me.lesson.file.view');

    Route::post('quiz/{quizUuid}/attempt', [QuizAttemptController::class, 'store'])->name('me.quiz.attempt');
    Route::post('quiz/{quizUuid}/reset', [QuizAttemptController::class, 'reset'])->name('me.quiz.reset');
    Route::post('assignments/{assignmentUuid}/submit', [AssignmentSubmissionController::class, 'store'])->name('me.assignment.submit');
    Route::get('certificates/{certificateUuid}', [CertificateController::class, 'download'])->name('me.certificate');

    Route::get('bookings', [MyBookingsController::class, 'index'])->name('me.bookings');
    Route::get('purchases', [MyPurchasesController::class, 'index'])->name('me.purchases');
    Route::get('purchases/{orderUuid}/invoice', [MyPurchasesController::class, 'invoice'])->name('me.invoice');
    Route::get('books/{bookUuid}/download', [BookDownloadController::class, 'download'])->name('me.book.download');

    Route::get('account', [AccountController::class, 'show'])->name('me.account');
    Route::put('account', [AccountController::class, 'update'])->name('me.account.update');
    Route::post('account/phone', [AccountController::class, 'sendPhoneCode'])->middleware('throttle:10,1')->name('me.account.phone');
    Route::post('account/phone/verify', [AccountController::class, 'verifyPhone'])->middleware('throttle:login-ip')->name('me.account.phone.verify');
});
