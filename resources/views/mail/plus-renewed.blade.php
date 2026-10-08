<x-mail::message :preheader="'₹' . $amount . ' paid' . ($nextCharge ? ' · next charge ' . $nextCharge : '')">
<x-mail::badge tone="plus">{{ $first ? 'Plus · auto-renew on' : 'Plus renewed' }}</x-mail::badge>

# {{ $first ? 'Plus is active' : 'Payment received' }}

Hi {{ $name }}, {{ $first ? 'thanks — your Plus plan is active and renews every month.' : 'we received this month\'s Plus payment.' }}

<x-mail::summary>
<x-mail::row label="Plan">Plus — monthly</x-mail::row>
@if ($nextCharge)
<x-mail::row label="Next charge">{{ $nextCharge }}</x-mail::row>
@endif
<x-mail::row label="Invoice">{{ $invoiceNumber }}</x-mail::row>
<x-mail::row label="Amount paid" :total="true">₹{{ $amount }}</x-mail::row>
</x-mail::summary>

<small>Includes GST. You can turn off auto-renew any time from Billing — Plus stays on until the end of the month you have paid for.</small>

<x-mail::button :url="$invoiceUrl" color="accent">
View invoice
</x-mail::button>
</x-mail::message>
