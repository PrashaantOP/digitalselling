<x-mail::message>
# Your week at a glance

Hi {{ $name }}, here's what happened from {{ $stats['from'] }} to {{ $stats['to'] }}.

<x-mail::panel>
**Sales:** {{ $stats['sales'] }}<br>
**Paid by buyers:** ₹{{ number_format($stats['revenue'], 2) }}<br>
**You earned:** ₹{{ number_format($stats['earned'], 2) }}<br>
**New course students:** {{ $stats['enrollments'] }}<br>
**Courses completed:** {{ $stats['completions'] }}
@if ($stats['top'])
<br>**Best seller:** {{ $stats['top'] }}
@endif
</x-mail::panel>

<x-mail::button :url="$url">
Open your dashboard
</x-mail::button>

<small>You get this email because “Weekly digest” is on in your notification settings.</small>
</x-mail::message>
