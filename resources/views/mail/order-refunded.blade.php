@if ($forCreator)
<x-mail::message :brand="$brand" audience="creator" :preheader="$amount . ' refunded · ' . $title . ' · ' . $orderNumber">
<x-mail::badge tone="warning">Order refunded</x-mail::badge>

# {{ $orderNumber }} was refunded

Hi {{ $name }}, the buyer of **{{ $title }}** got their money back and their access has ended.

<x-mail::summary>
<x-mail::row label="Refunded to buyer">{{ $amount }}</x-mail::row>
<x-mail::row label="Order">{{ $orderNumber }}</x-mail::row>
<x-mail::row label="Your earning reversed" :total="true">− {{ $net }}</x-mail::row>
</x-mail::summary>

<x-mail::notice tone="{{ $settled ? 'warning' : 'info' }}">
@if ($settled)
This order was already paid out to you, so **{{ $net }}** will be deducted from your next settlement.
@else
This order had not been paid out yet, so it is simply left out of your next settlement.
@endif
</x-mail::notice>

<x-mail::button :url="$url">
View payments
</x-mail::button>
</x-mail::message>
@else
<x-mail::message :brand="$brand" :preheader="$amount . ' is on its way back to you'">
<x-mail::badge tone="info">Refund on its way</x-mail::badge>

# We've refunded {{ $amount }}

Hi {{ $name }}, your refund for **{{ $title }}** has been sent.

<x-mail::summary>
<x-mail::row label="Product">{{ $title }}</x-mail::row>
<x-mail::row label="Order">{{ $orderNumber }}</x-mail::row>
<x-mail::row label="Refunded" :total="true">{{ $amount }}</x-mail::row>
</x-mail::summary>

The money goes back to the card, UPI or bank account you paid with. It usually shows up within **5–7 working days**, depending on your bank.

<small>Your access to this purchase has ended.</small>
</x-mail::message>
@endif
