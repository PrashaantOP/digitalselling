<x-mail::message :preheader="'₹' . $amount . ' paid · Plus' . ($validTill ? ' till ' . $validTill : '')">
<x-mail::badge tone="plus">Plus plan</x-mail::badge>

# Payment received — Plus is active

Hi {{ $name }}, thanks! Your Plus plan is active.

<x-mail::summary>
<x-mail::row label="Plan">Plus — {{ $months }} month{{ $months > 1 ? 's' : '' }}</x-mail::row>
@if ($validTill)
<x-mail::row label="Valid till">{{ $validTill }}</x-mail::row>
@endif
@if ($invoiceNumber)
<x-mail::row label="Invoice">{{ $invoiceNumber }}</x-mail::row>
@endif
<x-mail::row label="Amount paid" :total="true">₹{{ $amount }}</x-mail::row>
</x-mail::summary>

<small>Includes GST. This purchase does not renew on its own — we will remind you before it ends, or you can turn on auto-renew from Billing.</small>

<x-mail::button :url="$invoiceUrl" color="accent">
View invoice
</x-mail::button>
</x-mail::message>
