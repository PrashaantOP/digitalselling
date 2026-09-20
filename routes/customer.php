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
    Route::get('courses/{enrollmentId}/learn/{lessonId?}', [LessonPlayerController::class, 'show'])
        ->whereNumber(['enrollmentId', 'lessonId'])->name('me.learn');
    Route::post('lessons/{lessonId}/complete', [LessonPlayerController::class, 'markComplete'])->whereNumber('lessonId')->name('me.lesson.complete');
    Route::get('lesson-files/{fileId}', [LessonPlayerController::class, 'noteFile'])->whereNumber('fileId')->name('me.lesson.file');

    Route::post('quiz/{quizId}/attempt', [QuizAttemptController::class, 'store'])->whereNumber('quizId')->name('me.quiz.attempt');
    Route::post('assignments/{assignmentId}/submit', [AssignmentSubmissionController::class, 'store'])->whereNumber('assignmentId')->name('me.assignment.submit');
    Route::get('certificates/{certificateId}', [CertificateController::class, 'download'])->whereNumber('certificateId')->name('me.certificate');

    Route::get('bookings', [MyBookingsController::class, 'index'])->name('me.bookings');
    Route::get('purchases', [MyPurchasesController::class, 'index'])->name('me.purchases');
    Route::get('books/{bookId}/download', [BookDownloadController::class, 'download'])->whereNumber('bookId')->name('me.book.download');
});
