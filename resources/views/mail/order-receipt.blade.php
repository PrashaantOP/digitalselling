@php($free = $amount === 'Free')
<x-mail::message :brand="$brand" :preheader="($free ? 'Free' : $amount . ' paid') . ' · ' . $title . ' · ' . $orderNumber">
<x-mail::badge tone="success">{{ $free ? "You're in" : 'Payment received' }}</x-mail::badge>

# Your purchase is confirmed

Hi {{ $name }}, thanks for buying{{ $creatorName ? " from {$creatorName}" : '' }}. Everything you need is below.

<x-mail::summary>
<x-mail::row label="Product">{{ $title }}</x-mail::row>
@foreach ($addons as $addon)
<x-mail::row label="Add-on">{{ $addon }}</x-mail::row>
@endforeach
<x-mail::row label="Order">{{ $orderNumber }}</x-mail::row>
<x-mail::row label="{{ $free ? 'Price' : 'Total paid' }}" :total="true">{{ $amount }}</x-mail::row>
</x-mail::summary>

@if ($note)
<x-mail::notice tone="info">
**A note from {{ $creatorName ?: 'the creator' }}**

{{ $note }}
</x-mail::notice>

@endif
@if (count($files))
## Your files

<x-mail::files :files="$files" />

<small>These links are yours — keep this email. They are also under Purchases when you sign in.</small>

@endif
<x-mail::button :url="$openUrl">
Open your purchase
</x-mail::button>

<small>Sign in with this email address and we'll send you a one-time code — no password needed.</small>
</x-mail::message>
