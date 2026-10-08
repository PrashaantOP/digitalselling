<x-mail::message :brand="$brand" :preheader="$sessionTitle . ' · ' . $when">
<x-mail::badge tone="success">Booking confirmed</x-mail::badge>

# You're booked!

Hi {{ $name }}, your **{{ $sessionTitle }}** with {{ $creatorName }} is confirmed.

<x-mail::summary>
<x-mail::row label="When">{{ $when }}</x-mail::row>
<x-mail::row label="Time zone">{{ $timezone }}</x-mail::row>
<x-mail::row label="Duration">{{ $duration }} minutes</x-mail::row>
@if ($meetingLink)
<x-mail::row label="Join link"><a href="{{ $meetingLink }}" class="break-all">{{ $meetingLink }}</a></x-mail::row>
@endif
</x-mail::summary>

@unless ($meetingLink)
<x-mail::notice tone="info">
{{ $creatorName }} will share the meeting link with you before the call.
</x-mail::notice>

@endunless
<x-mail::button :url="$calendarUrl">
Add to Google Calendar
</x-mail::button>

See you there,<br>
**{{ $creatorName }}**
</x-mail::message>
