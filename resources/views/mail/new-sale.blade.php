<x-mail::message>
# New sale

Hi {{ $name }}, **{{ $buyer }}** just bought **{{ $title }}**.

<x-mail::panel>
**Paid by buyer:** ₹{{ $total }}<br>
**Platform commission:** − ₹{{ $fee }}<br>
**You earn:** ₹{{ $net }}<br>
**Order:** {{ $orderNumber }}@if ($buyerEmail)<br>
**Buyer email:** {{ $buyerEmail }}@endif
</x-mail::panel>

This amount is added to your next automatic settlement.

<x-mail::button :url="$url">
View payments
</x-mail::button>
</x-mail::message>
