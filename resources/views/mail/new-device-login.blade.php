<x-mail::message audience="security" :preheader="'New sign-in from ' . $device . ' · ' . $when">
<x-mail::badge tone="warning">New sign-in</x-mail::badge>

# New sign-in to your account

Hi {{ $name ?: 'there' }}, your account was just signed in to from a device we haven't seen before.

<x-mail::summary>
<x-mail::row label="Device">{{ $device }}</x-mail::row>
<x-mail::row label="IP address">{{ $ip ?? 'unknown' }}</x-mail::row>
<x-mail::row label="Time">{{ $when }}</x-mail::row>
</x-mail::summary>

If this was you, there's nothing to do.

<x-mail::notice tone="danger">
**If it wasn't you**, change your password right away and sign out every other device from Security settings.
</x-mail::notice>

<x-mail::button :url="$passwordUrl" color="danger">
Change password
</x-mail::button>

<small>You can also review active sessions and turn on two-step verification in [Security settings]({{ $securityUrl }}).</small>
</x-mail::message>
