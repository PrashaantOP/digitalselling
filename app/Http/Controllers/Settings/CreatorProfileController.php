<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Concerns\HandlesUploads;
use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Http\Controllers\Controller;
use App\Mail\SecurityNoticeMail;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CreatorProfileController extends Controller
{
    use RespondsFlexibly, HandlesUploads;

    /** Storefront ke top-level routes se clash na ho. Auth module me registration pe bhi yahi list use karo. */
    public const RESERVED_USERNAMES = [
        'dashboard',
        'me',
        'login',
        'register',
        'logout',
        'otp',
        'invite',
        'book',
        'w',
        'c',
        'e',
        'b',
        'l',
        'p',
        'settings',
        'verify-email',
        'email',
        'confirm-password',
        'checkout',
        'certificates',
        'webhooks',
        'api',
        'storage',
        'admin',
        'track',
        'up',
        'forgot-password',
        'reset-password',
        // landing footer pages (HomeController::PAGES)
        'privacy-policy',
        'terms',
        'refund-policy',
        'about',
        'contact',
        'products',
    ];

    /** Username ka ek hi rule — registration (Str::slug → hyphen), profile aur Store tab teeno yahi maante hain. */
    public const USERNAME_REGEX = 'regex:/^[a-z0-9_.\-]{3,30}$/';

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
            // email badle to password dobara (account takeover se bachav)
            'current_password' => [
                Rule::requiredIf(fn () => strtolower((string) $request->input('email')) !== strtolower((string) $user->email)),
                'nullable',
                'current_password',
            ],
        ];

        // username sirf owner creator ka hota hai (public URL). Phone yahan change nahi hota — OTP re-verify chahiye (Auth module).
        if ($user->isCreator()) {
            $rules['username'] = [
                'required',
                self::USERNAME_REGEX,
                Rule::notIn(self::RESERVED_USERNAMES),
                Rule::unique('users', 'username')->ignore($user->id),
            ];
        }

        $data = $request->validate($rules);
        unset($data['current_password']);
        $oldEmail = $user->email;

        if ($request->hasFile('avatar')) {
            $this->deletePublic($user->avatar);
            $data['avatar'] = $this->putPublic($request->file('avatar'), 'profile', $user->id);
        } else {
            unset($data['avatar']);
        }

        if ($data['email'] !== $user->email) {
            $user->email_verified_at = null;
        }

        $user->fill($data)->save();

        if ($user->email !== $oldEmail) {
            SecurityNoticeMail::deliver($oldEmail, 'email_changed', $user->name, $request, $user->email);
            $user->sendEmailVerificationNotification();
        }

        return $this->done($request, 'Profile updated.', ['profile' => $user->fresh()]);
    }
}
