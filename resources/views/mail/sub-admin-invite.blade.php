<x-mail::message :preheader="$creatorName . ' invited you to help run their store'">
<x-mail::badge tone="info">Team invitation</x-mail::badge>

# You're invited to a team

**{{ $creatorName }}** has invited you to help manage their store.

<x-mail::summary>
<x-mail::row label="Store owner">{{ $creatorName }}</x-mail::row>
@if ($role)
<x-mail::row label="Your role">{{ $role }}</x-mail::row>
@endif
<x-mail::row label="Link expires">In {{ $days }} days</x-mail::row>
</x-mail::summary>

<x-mail::button :url="$url">
Accept invitation
</x-mail::button>

<small>This link works once. If you weren't expecting this, you can ignore this email — nothing happens unless you accept.</small>
</x-mail::message>
