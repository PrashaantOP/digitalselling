<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class StoreSettingsController extends Controller
{
    use RespondsFlexibly;

    public function edit()
    {
        $store = StoreController::storeFor($this->tid());

        return Inertia::render('Store/Edit', [
            'store' => $store->load(['appearance', 'socialLinks', 'headerButtons']),
            'tab' => 'settings',
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'column_layout' => ['required', Rule::in(['single', 'double'])],
            'sensitive_content_warning' => ['sometimes', 'boolean'],
            'meta_title' => ['nullable', 'string', 'max:70'],
            'meta_description' => ['nullable', 'string', 'max:200'],
            'fb_pixel_id' => ['nullable', 'string', 'max:50'],
            'ga_tracking_id' => ['nullable', 'string', 'max:50'],
        ]);

        $store = StoreController::storeFor($this->tid());
        $store->update($data);

        return $this->done($request, 'Settings saved.', ['store' => $store->fresh()]);
    }
}
