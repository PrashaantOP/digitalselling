<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\AssignmentSubmission;
use App\Models\LessonAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AssignmentSubmissionController extends Controller
{
    use ResolvesCustomer;

    /** POST /me/assignments/{assignmentId}/submit  (multipart) — dobara submit karne pe purani submission replace hoti hai */
    public function store(Request $request, int $assignmentId)
    {
        $assignment = LessonAssignment::with('lesson.module')->findOrFail($assignmentId);
        $enrollment = $this->enrollmentForCourse($assignment->lesson->module->course_id);

        abort_unless($assignment->lesson->is_published, 404);

        $data = $request->validate([
            'submission_text' => ['nullable', 'string', 'max:20000'],
            'file' => [$assignment->allow_file_upload ? 'nullable' : 'prohibited', 'file', 'max:20480',
                'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,txt,zip,jpg,jpeg,png'],
        ]);

        if (blank($data['submission_text'] ?? null) && ! $request->hasFile('file')) {
            throw ValidationException::withMessages(['submission_text' => 'Write your answer or attach a file.']);
        }

        $submission = AssignmentSubmission::firstOrNew(['lesson_assignment_id' => $assignment->id, 'enrollment_id' => $enrollment->id]);

        if ($request->hasFile('file')) {
            if ($submission->submission_file_path) {
                Storage::disk('local')->delete($submission->submission_file_path);
            }
            $submission->submission_file_path = $request->file('file')->store("submissions/{$enrollment->id}", 'local');
        }

        $submission->fill([
            'submission_text' => $data['submission_text'] ?? null,
            'status' => 'submitted',
            'grade_feedback' => null,
            'submitted_at' => now(),
        ])->save();

        return response()->json(['submission' => $submission->only(['id', 'status', 'submitted_at'])], 201);
    }
}
