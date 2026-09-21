<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesUploads;
use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class StoreController extends Controller
{
    use RespondsFlexibly, HandlesUploads;

    /** Store row onboarding me bani hoti hai; na ho to yahin default bana dete hain. */
    public static function storeFor(int $creatorId): Store
    {
        $store = Store::firstOrCreate(
            ['user_id' => $creatorId],
            ['display_name' => \App\Models\User::whereKey($creatorId)->value('name')]
        );

        // Store and creator profile share one public username.
        $user = $store->user;
        if ($user && blank($user->username)) {
            $user->forceFill([
                'username' => \App\Models\User::uniqueUsername($store->display_name ?: 'store', $user->id),
            ])->save();
        }
        if ($user && $store->username !== $user->username) {
            $store->forceFill(['username' => $user->username])->save();
        }

        return $store;
    }

    /** Ek hi Inertia page — Store / Analytics / Appearance / Settings tabs client-side. */
    public function edit()
    {
        $store = self::storeFor($this->tid())->load(['appearance', 'socialLinks', 'headerButtons']);

        return Inertia::render('Store/Edit', ['store' => $store]);
    }

    public function update(Request $request)
    {
        $store = self::storeFor($this->tid());

        $data = $request->validate([
            'username' => ['required', 'string', 'max:30', 'regex:/^[a-z0-9]+$/', Rule::unique('stores', 'username')->ignore($store->id), Rule::unique('users', 'username')->ignore($store->user_id)],
            'display_name' => ['required', 'string', 'max:150'],
            'bio' => ['nullable', 'string', 'max:500'],
            'welcome_message' => ['nullable', 'string', 'max:500'],
            'header_heading' => ['nullable', 'string', 'max:150'],
            'is_live' => ['sometimes', 'boolean'],
            'avatar' => ['nullable', 'image', 'max:3072'],
        ]);

        if ($request->hasFile('avatar')) {
            $this->deletePublic($store->avatar);
            $data['avatar'] = $this->putPublic($request->file('avatar'), 'store');
        } else {
            unset($data['avatar']);
        }

        DB::transaction(function () use ($store, $data) {
            $user = $store->user;
            if ($user && array_key_exists('username', $data)) {
                $user->update(['username' => $data['username']]);
            }
            $store->update($data);
        });

        return $this->done($request, 'Store updated.', ['store' => $store->fresh()]);
    }
}
