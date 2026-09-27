<x-mail::message>
# New sign-in to your account

Hi {{ $name ?: 'there' }}, your account was just signed in to from a device we haven't seen before.

<x-mail::panel>
**Device:** {{ $device }}<br>
**IP address:** {{ $ip ?? 'unknown' }}<br>
**Time:** {{ $when }}
</x-mail::panel>

If this was you, there's nothing to do.

**If it wasn't you**, change your password right away and sign out every other device from Security settings.

<x-mail::button :url="$passwordUrl">
Change password
</x-mail::button>

You can also review active sessions and turn on two-step verification at {{ $securityUrl }}.
</x-mail::message>
