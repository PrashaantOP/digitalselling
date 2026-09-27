<x-mail::message>
# You're booked!

Hi {{ $name }}, your **{{ $sessionTitle }}** with {{ $creatorName }} is confirmed.

<x-mail::panel>
**When:** {{ $when }} ({{ $timezone }})<br>
**Duration:** {{ $duration }} minutes
@if ($meetingLink)
<br>**Join link:** [{{ $meetingLink }}]({{ $meetingLink }})
@endif
</x-mail::panel>

@unless ($meetingLink)
{{ $creatorName }} will share the meeting link with you before the call.
@endunless

<x-mail::button :url="$calendarUrl">
Add to Google Calendar
</x-mail::button>

See you there,<br>
{{ $creatorName }}
</x-mail::message>
