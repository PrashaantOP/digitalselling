<x-mail::message audience="creator" :preheader="($customer?->name ?: 'Someone') . ' · ' . $when">
<x-mail::badge tone="info">New booking</x-mail::badge>

# {{ $customer?->name ?: 'Someone' }} booked {{ $sessionTitle }}

<x-mail::summary>
<x-mail::row label="When">{{ $when }}</x-mail::row>
<x-mail::row label="Duration">{{ $duration }} minutes</x-mail::row>
<x-mail::row label="Email">{{ $customer?->email ?? '—' }}</x-mail::row>
<x-mail::row label="Phone">{{ $customer?->phone ?? '—' }}</x-mail::row>
</x-mail::summary>

@if ($responses->isNotEmpty())
<x-mail::summary title="Their answers">
@foreach ($responses as $response)
<x-mail::row :label="$response->question_label">{{ $response->answer }}</x-mail::row>
@endforeach
</x-mail::summary>

@endif
@unless ($meetingLink)
<x-mail::notice tone="warning">
This session has no default meeting link. Add one for this booking from your dashboard so the customer can join.
</x-mail::notice>

@endunless
<x-mail::button :url="$dashboardUrl">
View bookings
</x-mail::button>
</x-mail::message>
