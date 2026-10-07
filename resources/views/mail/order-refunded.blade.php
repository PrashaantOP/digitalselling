<x-mail::message>
@if ($forCreator)
# Order refunded

Hi {{ $name }}, order **{{ $orderNumber }}** for **{{ $title }}** was refunded to the buyer.

<x-mail::panel>
**Refunded to buyer:** {{ $amount }}<br>
**Your earning reversed:** {{ $net }}<br>
@if ($settled)
This order was already paid out to you, so {{ $net }} will be deducted from your next settlement.
@else
This order had not been paid out yet, so it is simply removed from your next settlement.
@endif
</x-mail::panel>

The buyer's access to this purchase has ended.

<x-mail::button :url="$url">
View payments
</x-mail::button>
@else
# Your refund is on its way

Hi {{ $name }}, we've refunded **{{ $amount }}** for **{{ $title }}** (order {{ $orderNumber }}).

The money goes back to the card, UPI or bank account you paid with. It usually shows up within **5–7 working days**, depending on your bank.

Your access to this purchase has ended.
@endif
</x-mail::message>
