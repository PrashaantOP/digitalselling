<x-mail::message>
# {{ $first ? 'Pro is active' : 'Pro renewed' }}

Hi {{ $name }}, {{ $first ? 'thanks — your Pro plan is active and renews every month.' : 'we received this month\'s Pro payment.' }}

<x-mail::panel>
**Amount paid:** ₹{{ $amount }} (incl. GST)<br>
@if ($nextCharge)
**Next charge:** {{ $nextCharge }}<br>
@endif
**Invoice:** {{ $invoiceNumber }}
</x-mail::panel>

You can turn off auto-renew any time from Billing. Pro stays on until the end of the month you have paid for.

<x-mail::button :url="$invoiceUrl">
View invoice
</x-mail::button>
</x-mail::message>
