<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
        $store = StoreController::storeFor($this->tid());

        $data = $request->validate([
            'username' => ['sometimes', 'required', 'string', 'max:30', 'regex:/^[a-z0-9]+$/', Rule::unique('stores', 'username')->ignore($store->id), Rule::unique('users', 'username')->ignore($store->user_id)],
            'column_layout' => ['required', Rule::in(['single', 'double'])],
            'sensitive_content_warning' => ['sometimes', 'boolean'],
            'meta_title' => ['nullable', 'string', 'max:70'],
            'meta_description' => ['nullable', 'string', 'max:200'],
            'fb_pixel_id' => ['nullable', 'string', 'max:50'],
            'ga_tracking_id' => ['nullable', 'string', 'max:50'],
        ]);

        DB::transaction(function () use ($store, $data) {
            $user = $store->user;
            if ($user && array_key_exists('username', $data)) {
                $user->update(['username' => $data['username']]);
            }
            $store->update($data);
        });

        return $this->done($request, 'Settings saved.', ['store' => $store->fresh()]);
    }
}
