<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesUploads;
use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\StoreAppearance;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class StoreAppearanceController extends Controller
{
    use RespondsFlexibly, HandlesUploads;

    public function edit()
    {
        $store = StoreController::storeFor($this->tid());

        return Inertia::render('Store/Edit', [
            'store' => $store->load(['appearance', 'socialLinks', 'headerButtons']),
            'tab' => 'appearance',
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'theme' => ['required', Rule::in(['classic', 'ocean', 'sunset', 'forest', 'mono', 'paper'])],
            'brand_color' => ['nullable', 'regex:/^#?[0-9A-Fa-f]{6}$/'],
            'font_family' => ['nullable', 'string', 'max:50'],
            'custom_background' => ['nullable', 'image', 'max:5120'],
            'remove_background' => ['sometimes', 'boolean'],
        ]);

        // Color ko hamesha '#' prefix ke saath store karte hain (DB default ke saath consistent).
        if (! empty($data['brand_color'])) {
            $data['brand_color'] = '#' . ltrim($data['brand_color'], '#');
        }

        $store = StoreController::storeFor($this->tid());
        $appearance = StoreAppearance::firstOrNew(['store_id' => $store->id]);

        if ($request->hasFile('custom_background')) {
            $this->deletePublic($appearance->custom_background_path);
            $appearance->custom_background_path = $this->putPublic($request->file('custom_background'), 'store');
        } elseif ($request->boolean('remove_background')) {
            $this->deletePublic($appearance->custom_background_path);
            $appearance->custom_background_path = null;
        }

        $appearance->fill(collect($data)->only(['theme', 'brand_color', 'font_family'])->all())->save();

        return $this->done($request, 'Appearance saved.', ['appearance' => $appearance]);
    }
}
