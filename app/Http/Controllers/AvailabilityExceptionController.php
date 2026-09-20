<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\AvailabilityException;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AvailabilityExceptionController extends Controller
{
    use RespondsFlexibly;

    public function store(Request $request)
    {
        $data = $request->validate([
            'date' => ['required', 'date', 'after_or_equal:today',
                Rule::unique('availability_exceptions', 'date')->where('user_id', $this->tid())],
            'reason' => ['nullable', 'string', 'max:150'],
        ]);

        $exception = AvailabilityException::create($data + ['user_id' => $this->tid(), 'is_blocked' => true]);

        return $this->done($request, 'Date blocked.', ['exception' => $exception], null, 201);
    }

    public function destroy(Request $request, AvailabilityException $exception)
    {
        $exception->delete();

        return $this->done($request, 'Date unblocked.');
    }
}
