<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\LiveClass;
use App\Models\Product;
use Illuminate\Http\Request;

class LiveClassController extends Controller
{
    use RespondsFlexibly;

    private function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:5000'],
            'scheduled_at' => ['required', 'date'],
            'duration_minutes' => ['required', 'integer', 'min:5', 'max:720'],
            'join_link' => ['nullable', 'url', 'max:500'],
        ];
    }

    public function store(Request $request, Product $course)
    {
        $liveClass = $course->courseDetail->liveClasses()->create($request->validate($this->rules()));

        return $this->done($request, 'Live class scheduled.', ['liveClass' => $liveClass], null, 201);
    }

    public function update(Request $request, LiveClass $liveClass)
    {
        $liveClass->update($request->validate($this->rules()));

        return $this->done($request, 'Live class updated.', ['liveClass' => $liveClass]);
    }

    public function destroy(Request $request, LiveClass $liveClass)
    {
        $liveClass->delete();

        return $this->done($request, 'Live class deleted.');
    }
}
