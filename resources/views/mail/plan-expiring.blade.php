<x-mail::message>
# {{ $daysLeft > 0 ? 'Your Pro plan ends on ' . $expiresOn : 'Your Pro plan ends today' }}

Hi {{ $name ?: 'there' }}, Pro does not renew on its own.

<x-mail::panel>
**On Pro:** {{ rtrim(rtrim(number_format($proRate, 2), '0'), '.') }}% commission per sale<br>
**After it ends:** {{ rtrim(rtrim(number_format($freeRate, 2), '0'), '.') }}% commission per sale, and Pro-only designs switch back to the free one
</x-mail::panel>

Extend now and the new months are added after your current end date — nothing is lost.

<x-mail::button :url="$billingUrl">
Extend Pro
</x-mail::button>
</x-mail::message>
