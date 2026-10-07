<x-mail::message>
# {{ $daysLeft > 0 ? 'Your Pro plan ends on ' . $expiresOn : 'Your Pro plan ends today' }}

Hi {{ $name ?: 'there' }}, auto-renew is off for your Pro plan.

<x-mail::panel>
**On Pro:** {{ rtrim(rtrim(number_format($proRate, 2), '0'), '.') }}% commission per sale<br>
**After it ends:** {{ rtrim(rtrim(number_format($freeRate, 2), '0'), '.') }}% commission per sale, and Pro-only designs switch back to the free one
</x-mail::panel>

Turn on auto-renew and your first payment is taken only when the current period ends — no days are lost.

<x-mail::button :url="$billingUrl">
Keep Pro
</x-mail::button>
</x-mail::message>
