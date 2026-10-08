<x-mail::message audience="creator" :preheader="$stats['sales'] . ' sale' . ($stats['sales'] === 1 ? '' : 's') . ' · ₹' . number_format($stats['earned'], 2) . ' earned this week'" note="You get this email because “Weekly digest” is on in your notification settings.">
<x-mail::badge tone="primary">Your week</x-mail::badge>

# Your week at a glance

Hi {{ $name }}, here's what happened from {{ $stats['from'] }} to {{ $stats['to'] }}.

<x-mail::stats :items="[
    ['label' => 'Sales', 'value' => $stats['sales']],
    ['label' => 'You earned', 'value' => '₹' . number_format($stats['earned'], 2)],
    ['label' => 'New students', 'value' => $stats['enrollments']],
    ['label' => 'Courses completed', 'value' => $stats['completions']],
]" />

<x-mail::summary>
<x-mail::row label="Paid by buyers">₹{{ number_format($stats['revenue'], 2) }}</x-mail::row>
@if ($stats['top'])
<x-mail::row label="Best seller">{{ $stats['top'] }}</x-mail::row>
@endif
</x-mail::summary>

<x-mail::button :url="$url">
Open your dashboard
</x-mail::button>
</x-mail::message>
