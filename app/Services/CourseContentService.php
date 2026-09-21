<?php

namespace App\Services;

use App\Models\CourseDetail;
use App\Models\CourseLesson;

/** Course ke total_lessons counter ko modules/lessons se sync rakhta hai. */
class CourseContentService
{
    public static function recount(int $courseId): void
    {
        $count = CourseLesson::whereHas('module', fn ($q) => $q->where('course_id', $courseId))->count();

        CourseDetail::where('id', $courseId)->update(['total_lessons' => $count]);
    }
}
