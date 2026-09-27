<?php

use App\Http\Controllers\Customer\AssignmentSubmissionController;
use App\Http\Controllers\Customer\BookDownloadController;
use App\Http\Controllers\Customer\CertificateController;
use App\Http\Controllers\Customer\LessonPlayerController;
use App\Http\Controllers\Customer\MyBookingsController;
use App\Http\Controllers\Customer\MyCoursesController;
use App\Http\Controllers\Customer\MyPurchasesController;
use App\Http\Controllers\Customer\QuizAttemptController;
use Illuminate\Support\Facades\Route;

/*
| Customer portal — phone-OTP login ke baad, `customer` guard (config/auth.php me add karna hoga — Auth module).
| Params jaan-bujh ke *Id naam ke hain (plain ints) taaki dashboard ki creator-scoped bindings inpar apply na hon;
| har controller khud verify karta hai ki record is customer ka hi hai.
*/
Route::middleware('auth:customer')->prefix('me')->group(function () {
    Route::get('courses', [MyCoursesController::class, 'index'])->name('me.courses');
    Route::get('courses/{enrollmentUuid}/learn/{lessonUuid?}', [LessonPlayerController::class, 'show'])->name('me.learn');
    Route::post('lessons/{lessonUuid}/complete', [LessonPlayerController::class, 'markComplete'])->name('me.lesson.complete');
    Route::get('lesson-files/{fileUuid}', [LessonPlayerController::class, 'noteFile'])->name('me.lesson.file');

    Route::post('quiz/{quizUuid}/attempt', [QuizAttemptController::class, 'store'])->name('me.quiz.attempt');
    Route::post('assignments/{assignmentUuid}/submit', [AssignmentSubmissionController::class, 'store'])->name('me.assignment.submit');
    Route::get('certificates/{certificateUuid}', [CertificateController::class, 'download'])->name('me.certificate');

    Route::get('bookings', [MyBookingsController::class, 'index'])->name('me.bookings');
    Route::get('purchases', [MyPurchasesController::class, 'index'])->name('me.purchases');
    Route::get('books/{bookUuid}/download', [BookDownloadController::class, 'download'])->name('me.book.download');
});
