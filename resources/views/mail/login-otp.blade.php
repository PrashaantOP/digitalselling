<x-mail::message>
# {{ $isSetup ? 'Confirm two-step verification' : 'Your sign-in code' }}

Hi {{ $name ?: 'there' }}, use this code to {{ $isSetup ? 'turn on two-step verification' : 'finish signing in' }}:

<x-mail::panel>
<span style="font-size: 28px; font-weight: 700; letter-spacing: 8px;">{{ $code }}</span>
</x-mail::panel>

It expires in {{ $minutes }} minutes. Never share this code with anyone — our team will never ask for it.

**Request details:** {{ $ip ?? 'unknown IP' }} · {{ \Illuminate\Support\Str::limit($userAgent, 80) }}

If this wasn't you, someone knows your password. Change it right away.
</x-mail::message>
