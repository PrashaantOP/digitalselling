@php($pct = fn ($v) => rtrim(rtrim(number_format($v, 2), '0'), '.') . '%')
<x-mail::message :preheader="$daysLeft > 0 ? 'Plus ends on ' . $expiresOn . ' — keep your ' . $pct($plusRate) . ' commission' : 'Plus ends today'">
<x-mail::badge tone="warning">{{ $daysLeft > 0 ? "Plus ends in {$daysLeft} day" . ($daysLeft > 1 ? 's' : '') : 'Plus ends today' }}</x-mail::badge>

# {{ $daysLeft > 0 ? 'Your Plus plan ends on ' . $expiresOn : 'Your Plus plan ends today' }}

Hi {{ $name ?: 'there' }}, auto-renew is off for your Plus plan.

<x-mail::summary>
<x-mail::row label="On Plus">{{ $pct($plusRate) }} commission per sale</x-mail::row>
<x-mail::row label="After it ends">{{ $pct($freeRate) }} commission per sale</x-mail::row>
</x-mail::summary>

Plus-only designs also switch back to the free one. Turn on auto-renew and your first payment is taken only when the current period ends — no days are lost.

<x-mail::button :url="$billingUrl" color="accent">
Keep Plus
</x-mail::button>
</x-mail::message>
