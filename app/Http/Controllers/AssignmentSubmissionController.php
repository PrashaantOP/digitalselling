<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\AssignmentSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

/** Creator side: submissions dekhna + grade/feedback dena. */
class AssignmentSubmissionController extends Controller
{
    use RespondsFlexibly;

    public function index(Request $request)
    {
        $submissions = AssignmentSubmission::query()
            ->with([
                'enrollment.customer:id,name,email',
                'enrollment.course.product:id,title',
                'assignment.lesson:id,title',
            ])
            ->whereHas('enrollment.course.product', fn ($q) => $q->where('creator_id', $this->tid())
                ->when($request->query('course'), fn ($c, $id) => $c->whereKey($id)))
            ->when($request->query('status'), fn ($q, $v) => $q->where('status', $v))
            ->latest('submitted_at')->paginate(20)->withQueryString();

        return Inertia::render('Courses/Submissions', [
            'submissions' => $submissions,
            'filters' => $request->only(['status', 'course']),
        ]);
    }

    public function grade(Request $request, AssignmentSubmission $submission)
    {
        $data = $request->validate(['grade_feedback' => ['required', 'string', 'max:5000']]);

        $submission->update(['grade_feedback' => $data['grade_feedback'], 'status' => 'graded']);

        return $this->done($request, 'Feedback saved.', ['submission' => $submission]);
    }

    /** Private file download (creator-scoped binding se safe). */
    public function file(AssignmentSubmission $submission)
    {
        abort_unless($submission->submission_file_path && Storage::disk('local')->exists($submission->submission_file_path), 404);

        return Storage::disk('local')->download($submission->submission_file_path);
    }
}
