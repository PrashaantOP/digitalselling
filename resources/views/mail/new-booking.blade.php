<x-mail::message>
# New booking

**{{ $customer?->name ?: 'Someone' }}** booked **{{ $sessionTitle }}**.

<x-mail::panel>
**When:** {{ $when }}<br>
**Duration:** {{ $duration }} minutes<br>
**Email:** {{ $customer?->email ?? '—' }}<br>
**Phone:** {{ $customer?->phone ?? '—' }}
</x-mail::panel>

@if ($responses->isNotEmpty())
## Their answers

@foreach ($responses as $response)
**{{ $response->question_label }}**<br>
{{ $response->answer }}

@endforeach
@endif

@unless ($meetingLink)
This session has no default meeting link — add one for this booking from your dashboard so the customer can join.
@endunless

<x-mail::button :url="$dashboardUrl">
View bookings
</x-mail::button>
</x-mail::message>
