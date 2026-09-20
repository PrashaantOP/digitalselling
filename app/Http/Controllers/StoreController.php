<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesUploads;
use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Store;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StoreController extends Controller
{
    use RespondsFlexibly, HandlesUploads;

    /** Store row onboarding me bani hoti hai; na ho to yahin default bana dete hain. */
    public static function storeFor(int $creatorId): Store
    {
        return Store::firstOrCreate(
            ['user_id' => $creatorId],
            ['display_name' => \App\Models\User::whereKey($creatorId)->value('name')]
        );
    }

    /** Ek hi Inertia page — Store / Analytics / Appearance / Settings tabs client-side. */
    public function edit()
    {
        $store = self::storeFor($this->tid())->load(['appearance', 'socialLinks', 'headerButtons']);

        return Inertia::render('Store/Edit', ['store' => $store]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'display_name' => ['required', 'string', 'max:150'],
            'bio' => ['nullable', 'string', 'max:500'],
            'welcome_message' => ['nullable', 'string', 'max:500'],
            'header_heading' => ['nullable', 'string', 'max:150'],
            'is_live' => ['sometimes', 'boolean'],
            'avatar' => ['nullable', 'image', 'max:3072'],
        ]);

        $store = self::storeFor($this->tid());

        if ($request->hasFile('avatar')) {
            $this->deletePublic($store->avatar);
            $data['avatar'] = $this->putPublic($request->file('avatar'), 'store');
        } else {
            unset($data['avatar']);
        }

        $store->update($data);

        return $this->done($request, 'Store updated.', ['store' => $store->fresh()]);
    }
}
