<x-mail::message>
# You're invited to a team

{{ $creatorName }} has invited you to help manage their store{{ $role ? " as {$role}" : '' }}.

<x-mail::button :url="$url">
Accept invitation
</x-mail::button>

This link works once and expires in {{ $days }} days. If you weren't expecting this, you can ignore this email — nothing happens unless you accept.
</x-mail::message>
