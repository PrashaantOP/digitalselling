<x-mail::message audience="creator" :preheader="$paid ? '₹' . $amount . ' sent · ' . $number : 'Transfer of ₹' . $amount . ' did not go through · ' . $number">
@if ($paid)
<x-mail::badge tone="success">Settlement paid</x-mail::badge>

# ₹{{ $amount }} is on its way

Hi {{ $name }}, your settlement has been transferred.
@else
<x-mail::badge tone="danger">Transfer failed</x-mail::badge>

# We could not send ₹{{ $amount }}

Hi {{ $name }}, the bank transfer for your settlement did not go through. Your money is safe — it will be included in the next settlement.
@endif

<x-mail::summary>
<x-mail::row label="Settlement">{{ $number }}</x-mail::row>
@if ($orders)
<x-mail::row label="Orders">{{ $orders }}</x-mail::row>
@endif
@if ($destination)
<x-mail::row label="Sent to">{{ $destination }}</x-mail::row>
@endif
@if ($paid && $reference)
<x-mail::row label="Bank reference (UTR)">{{ $reference }}</x-mail::row>
@endif
@if (! $paid && $reason)
<x-mail::row label="Reason">{{ $reason }}</x-mail::row>
@endif
<x-mail::row label="Amount" :total="true">₹{{ $amount }}</x-mail::row>
</x-mail::summary>

@if ($paid)
Banks usually show the credit within a few hours.
@else
<x-mail::notice tone="warning">
Please check that your payout account details are correct.
</x-mail::notice>
@endif

<x-mail::button :url="$url">
View settlement
</x-mail::button>
</x-mail::message>
