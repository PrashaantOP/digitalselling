<x-mail::message preheader="Confirm your email address to finish setting up your account">
<x-mail::badge tone="primary">Welcome</x-mail::badge>

# Confirm your email address

Hi {{ $name ?: 'there' }}, thanks for signing up. Tap the button below so we know this email is yours — payouts and Plus payments need a verified email.

<x-mail::button :url="$url">
Verify email address
</x-mail::button>

<small>If you didn't create an account, you can ignore this email.</small>

<x-slot:subcopy>
If the button doesn't work, copy this link into your browser: <span class="break-all">[{{ $url }}]({{ $url }})</span>
</x-slot:subcopy>
</x-mail::message>
