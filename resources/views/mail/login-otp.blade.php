<x-mail::message :audience="$isCustomer ? null : 'security'" :preheader="'Your code is ' . $code . ' — it expires in ' . $minutes . ' minutes'">
<x-mail::badge tone="primary">{{ $isSetup ? 'Two-step verification' : 'Sign-in code' }}</x-mail::badge>

# {{ $isSetup ? 'Confirm two-step verification' : 'Your sign-in code' }}

Hi {{ $name ?: 'there' }}, use this code to {{ $isSetup ? 'turn on two-step verification' : 'finish signing in' }}:

<x-mail::code>{{ $code }}</x-mail::code>

It expires in **{{ $minutes }} minutes**. Never share this code with anyone — our team will never ask for it.

@if ($isCustomer)
<small>If this wasn't you, you can ignore this email — nobody can sign in without this code.</small>
@else
<x-mail::notice tone="danger">
**If this wasn't you**, someone knows your password. Change it right away.
</x-mail::notice>
@endif

<small>Requested from {{ $ip ?? 'an unknown IP' }} · {{ \Illuminate\Support\Str::limit($userAgent, 80) }}</small>
</x-mail::message>
