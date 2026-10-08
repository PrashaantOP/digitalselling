<x-mail::message :preheader="$halted ? 'Auto-renew stopped — subscribe again to keep Plus' : 'We could not charge your Plus renewal — Razorpay will retry'">
<x-mail::badge :tone="$halted ? 'danger' : 'warning'">{{ $halted ? 'Auto-renew stopped' : 'Payment failed' }}</x-mail::badge>

# {{ $halted ? 'Plus auto-renew has stopped' : 'Your Plus renewal did not go through' }}

Hi {{ $name }}, we could not charge your card or UPI for this month's Plus plan.

@if ($halted)
<x-mail::notice tone="danger">
Razorpay has stopped retrying, so auto-renew is now off.{{ $expiresOn ? " Plus stays on until **{$expiresOn}**, then commission goes back to the Free rate." : '' }}
</x-mail::notice>

Subscribe again from Billing with a working card or UPI to keep Plus.
@else
<x-mail::notice tone="warning">
Razorpay will try again over the next few days.{{ $expiresOn ? " Plus stays on until **{$expiresOn}**." : '' }}
</x-mail::notice>

Make sure your card or UPI account has enough balance and AutoPay is still allowed in your UPI app.
@endif

<x-mail::button :url="$billingUrl">
Open billing
</x-mail::button>
</x-mail::message>
