<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Http\Controllers\Controller;
use App\Models\NotificationPreference;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Dashboard → Settings → Notifications: creator kaun se emails paaye. */
class NotificationPreferenceController extends Controller
{
    use RespondsFlexibly;

    public function edit(Request $request)
    {
        $prefs = NotificationPreference::firstOrCreate(['user_id' => $request->user()->id]);

        return Inertia::render('settings/notifications', [
            'preferences' => collect(NotificationPreference::DEFAULTS)->map(fn ($default, $key) => (bool) ($prefs->{$key} ?? $default)),
            'email' => $request->user()->email,
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate(array_fill_keys(array_keys(NotificationPreference::DEFAULTS), ['sometimes', 'boolean']));

        NotificationPreference::updateOrCreate(['user_id' => $request->user()->id], $data);

        return $this->done($request, 'Notification preferences saved.');
    }
}
