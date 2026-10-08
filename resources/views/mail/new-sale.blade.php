<x-mail::message audience="creator" :preheader="$buyer . ' paid ₹' . $total . ' · you earn ₹' . $net">
<x-mail::badge tone="success">New sale</x-mail::badge>

# You earned ₹{{ $net }}

Hi {{ $name }}, **{{ $buyer }}** just bought **{{ $title }}**.

<x-mail::summary>
<x-mail::row label="Paid by buyer">₹{{ $total }}</x-mail::row>
<x-mail::row label="Platform commission">− ₹{{ $fee }}</x-mail::row>
<x-mail::row label="Order">{{ $orderNumber }}</x-mail::row>
@if ($buyerEmail)
<x-mail::row label="Buyer email"><a href="mailto:{{ $buyerEmail }}" class="break-all">{{ $buyerEmail }}</a></x-mail::row>
@endif
<x-mail::row label="You earn" :total="true">₹{{ $net }}</x-mail::row>
</x-mail::summary>

This amount is added to your next automatic settlement.

<x-mail::button :url="$url">
View payments
</x-mail::button>
</x-mail::message>
