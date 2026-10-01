<x-mail::message>
@if ($paid)
# ₹{{ $amount }} is on its way

Hi {{ $name }}, your settlement has been transferred.
@else
# We could not send ₹{{ $amount }}

Hi {{ $name }}, the bank transfer for your settlement did not go through. Your money is safe — it will be included in the next settlement.
@endif

<x-mail::panel>
**Settlement:** {{ $number }}<br>
**Amount:** ₹{{ $amount }}{{ $orders ? " · {$orders} order" . ($orders > 1 ? 's' : '') : '' }}<br>
@if ($destination)
**Sent to:** {{ $destination }}<br>
@endif
@if ($paid && $reference)
**Bank reference (UTR):** {{ $reference }}
@endif
@if (! $paid && $reason)
**Reason:** {{ $reason }}
@endif
</x-mail::panel>

@if ($paid)
Banks usually show the credit within a few hours.
@else
Please check that your payout account details are correct.
@endif

<x-mail::button :url="$url">
View settlement
</x-mail::button>
</x-mail::message>
