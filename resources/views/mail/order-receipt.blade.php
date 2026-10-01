<x-mail::message>
# You're in

Hi {{ $name }}, your purchase{{ $creatorName ? " from {$creatorName}" : '' }} is confirmed.

<x-mail::panel>
**{{ $title }}**<br>
@foreach ($addons as $addon)
+ {{ $addon }}<br>
@endforeach
**Paid:** {{ $amount }}<br>
**Order:** {{ $orderNumber }}
</x-mail::panel>

@if ($note)
{{ $note }}

@endif
Open it any time — sign in with this email address and we'll send you a one-time code. No password needed.

<x-mail::button :url="$openUrl">
Open your purchase
</x-mail::button>
</x-mail::message>
