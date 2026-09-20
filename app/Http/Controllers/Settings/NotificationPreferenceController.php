<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Http\Controllers\Controller;
use App\Models\NotificationPreference;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificationPreferenceController extends Controller
{
    use RespondsFlexibly;

    private const KEYS = ['course_enrollment', 'course_completion', 'new_messages', 'payment_received', 'weekly_digest'];

    public function edit(Request $request)
    {
        return Inertia::render('settings/notifications', [
            'preferences' => NotificationPreference::firstOrCreate(['user_id' => $request->user()->id]),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate(array_fill_keys(self::KEYS, ['sometimes', 'boolean']));

        $prefs = NotificationPreference::updateOrCreate(['user_id' => $request->user()->id], $data);

        return $this->done($request, 'Preferences saved.', ['preferences' => $prefs]);
    }
}
