<x-mail::message>
# {{ $headline }}

Hi {{ $name ?: 'there' }}, {{ lcfirst($body) }}

<x-mail::panel>
**When:** {{ $when }}<br>
**Device:** {{ $device }}<br>
**IP address:** {{ $ip ?? 'unknown' }}
</x-mail::panel>

If this was you, you can ignore this email.

**If it wasn't you**, reset your password right away — it signs out every device.

<x-mail::button :url="$passwordUrl">
Reset password
</x-mail::button>
</x-mail::message>
