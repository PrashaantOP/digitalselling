<x-mail::message audience="security" :preheader="$headline . ' · ' . $when">
<x-mail::badge tone="danger">Security alert</x-mail::badge>

# {{ $headline }}

Hi {{ $name ?: 'there' }}, {{ lcfirst($body) }}

<x-mail::summary>
<x-mail::row label="When">{{ $when }}</x-mail::row>
<x-mail::row label="Device">{{ $device }}</x-mail::row>
<x-mail::row label="IP address">{{ $ip ?? 'unknown' }}</x-mail::row>
</x-mail::summary>

If this was you, you can ignore this email.

<x-mail::notice tone="danger">
**If it wasn't you**, reset your password right away — it signs out every device.
</x-mail::notice>

<x-mail::button :url="$passwordUrl" color="danger">
Reset password
</x-mail::button>
</x-mail::message>
