<x-mail::message>
# {{ $halted ? 'Pro auto-renew has stopped' : 'Your Pro renewal did not go through' }}

Hi {{ $name }}, we could not charge your card or UPI for this month's Pro plan.

@if ($halted)
Razorpay has stopped retrying, so auto-renew is now off. {{ $expiresOn ? "Pro stays on until {$expiresOn}, then commission goes back to the Free rate." : '' }}

Subscribe again from Billing with a working card or UPI to keep Pro.
@else
Razorpay will try again over the next few days. Make sure your card or UPI account has enough balance and AutoPay is still allowed in your UPI app. {{ $expiresOn ? "Pro stays on until {$expiresOn}." : '' }}
@endif

<x-mail::button :url="$billingUrl">
Open billing
</x-mail::button>
</x-mail::message>
