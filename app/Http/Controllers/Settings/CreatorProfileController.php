<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Concerns\HandlesUploads;
use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CreatorProfileController extends Controller
{
    use RespondsFlexibly, HandlesUploads;

    /** Storefront ke top-level routes se clash na ho. Auth module me registration pe bhi yahi list use karo. */
    public const RESERVED_USERNAMES = [
        'dashboard', 'me', 'login', 'register', 'logout', 'otp', 'invite', 'book', 'c', 'e', 'b', 'l', 'p',
        'settings', 'verify-email', 'email', 'confirm-password',
        'checkout', 'webhooks', 'api', 'storage', 'admin', 'track', 'up', 'forgot-password', 'reset-password',
    ];

    public function edit()
    {
        return Inertia::render('settings/creator-profile', ['profile' => auth()->user()]);
    }

    public function update(Request $request)
    {
        $user = $request->user();

        $rules = [
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', Rule::unique('users', 'email')->ignore($user->id)],
            'avatar' => ['nullable', 'image', 'max:3072'],
        ];

        // username sirf owner creator ka hota hai (public URL). Phone yahan change nahi hota — OTP re-verify chahiye (Auth module).
        if ($user->isCreator()) {
            $rules['username'] = [
                'required', 'regex:/^[a-z0-9_.\-]{3,30}$/', Rule::notIn(self::RESERVED_USERNAMES),
                Rule::unique('users', 'username')->ignore($user->id),
            ];
        }

        $data = $request->validate($rules);

        if ($request->hasFile('avatar')) {
            $this->deletePublic($user->avatar);
            $data['avatar'] = $request->file('avatar')->store("avatars/{$user->id}", 'public');
        } else {
            unset($data['avatar']);
        }

        if ($data['email'] !== $user->email) {
            $user->email_verified_at = null;
        }

        $user->fill($data)->save();

        return $this->done($request, 'Profile updated.', ['profile' => $user->fresh()]);
    }
}
