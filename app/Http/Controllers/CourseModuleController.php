<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\CourseModule;
use App\Models\Product;
use App\Services\CourseContentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CourseModuleController extends Controller
{
    use RespondsFlexibly;

    public function store(Request $request, Product $course)
    {
        $data = $request->validate(['title' => ['required', 'string', 'max:150']]);

        $detail = $course->courseDetail;
        abort_unless($detail, 422, 'Course details are missing for this product.');

        $module = $detail->modules()->create([
            'title' => $data['title'],
            'sort_order' => (int) $detail->modules()->max('sort_order') + 1,
        ]);

        return $this->done($request, 'Module added.', ['module' => $module->load('lessons')], null, 201);
    }

    public function update(Request $request, CourseModule $module)
    {
        $module->update($request->validate(['title' => ['required', 'string', 'max:150']]));

        return $this->done($request, 'Module updated.', ['module' => $module]);
    }

    public function destroy(Request $request, CourseModule $module)
    {
        $courseId = $module->course_id;
        $module->delete(); // lessons + unke detail rows cascade se delete
        CourseContentService::recount($courseId);

        return $this->done($request, 'Module deleted.');
    }

    /** Drag-drop: body => order: [moduleId, moduleId, ...] (top → bottom) */
    public function reorder(Request $request)
    {
        $data = $request->validate([
            'order' => ['required', 'array', 'min:1'],
            'order.*' => ['integer', 'distinct'],
        ]);

        $valid = CourseModule::whereIn('id', $data['order'])
            ->whereHas('course.product', fn ($q) => $q->where('creator_id', $this->tid()))
            ->pluck('id')->all();

        abort_unless(count($valid) === count($data['order']), 404);

        DB::transaction(function () use ($data) {
            foreach ($data['order'] as $i => $id) {
                CourseModule::whereKey($id)->update(['sort_order' => $i]);
            }
        });

        return $this->done($request, 'Order saved.');
    }
}
