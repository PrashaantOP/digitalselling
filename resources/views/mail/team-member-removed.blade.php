<x-mail::message :preheader="'Your access to ' . $storeName . '\'s store has ended'">
<x-mail::badge tone="muted">Team access removed</x-mail::badge>

# You were removed from {{ $storeName }}'s team

Hi {{ $name ?: 'there' }}, {{ $storeName }} has removed you from their store team. You've been signed out and can no longer open their dashboard.

<small>If you think this is a mistake, contact {{ $storeName }} directly.</small>
</x-mail::message>
