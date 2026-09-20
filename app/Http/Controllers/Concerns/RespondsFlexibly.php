<?php

namespace App\Http\Controllers\Concerns;

use App\Support\Tenant;
use Illuminate\Http\Request;

/**
 * Inertia (redirect back + flash) aur Axios (JSON) dono ke liye ek hi controller action.
 * Axios request `Accept: application/json` bhejta hai => expectsJson() true.
 */
trait RespondsFlexibly
{
    protected function tid(): int
    {
        return Tenant::id();
    }

    protected function done(Request $request, string $message, array $data = [], ?string $to = null, int $status = 200)
    {
        if ($request->expectsJson()) {
            return response()->json(['message' => $message] + $data, $status);
        }

        return ($to ? redirect($to) : back())->with('success', $message);
    }
}
