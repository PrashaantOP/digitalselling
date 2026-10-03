<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\SettlementService;
use App\Mail\SecurityNoticeMail;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** Starter kit ka original (name/email + delete account). Creator-specific fields => CreatorProfileController. */
class ProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $oldEmail = $user->email;

        $user->fill($request->safe()->except('current_password'));

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        if ($user->email !== $oldEmail) {
            // purane address pe alert (agar ye chori hai to asli malik ko pata chale), naye pe verification link
            SecurityNoticeMail::deliver($oldEmail, 'email_changed', $user->name, $request, $user->email);
            $user->sendEmailVerificationNotification();
        }

        return to_route('profile.edit');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->validate(['password' => ['required', 'current_password']]);

        $user = $request->user();

        // creator ka paisa baaki ho to delete nahi — warna payout aur hisaab beech me atak jaata
        if ($user->isCreator() && ($pending = self::unsettledAmount($user)) > 0) {
            throw ValidationException::withMessages([
                'password' => 'You have ₹' . number_format($pending, 2) . ' waiting to be paid out. You can delete your account once it has been settled.',
            ]);
        }

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    /** Clearing + ready + in-transit + pending adjustments (koi bhi rakam, + ya −) — 0 ho tabhi account delete ho. */
    private static function unsettledAmount(User $user): float
    {
        $settlements = app(SettlementService::class);
        $balance = $settlements->balanceFor($user);
        $adjustments = abs((float) $settlements->pendingAdjustments($user->id)->sum('amount'));

        return round($balance['clearing'] + $balance['ready'] + $balance['in_transit'] + $adjustments, 2);
    }
}
