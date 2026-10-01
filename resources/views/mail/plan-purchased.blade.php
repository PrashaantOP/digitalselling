<x-mail::message>
# Payment received

Hi {{ $name }}, thanks — your Pro plan is active.

<x-mail::panel>
**Plan:** Pro — {{ $months }} month{{ $months > 1 ? 's' : '' }}<br>
**Amount paid:** ₹{{ $amount }} (incl. GST)<br>
@if ($validTill)
**Pro valid till:** {{ $validTill }}<br>
@endif
@if ($invoiceNumber)
**Invoice:** {{ $invoiceNumber }}
@endif
</x-mail::panel>

Pro does not renew on its own. We will remind you before it ends.

<x-mail::button :url="$invoiceUrl">
View invoice
</x-mail::button>
</x-mail::message>
