<x-mail::message>
# Course completed 🎉

Hi {{ $name }}, **{{ $student }}** just finished **{{ $title }}**.

@if ($certificate)
Their certificate was issued automatically with your design.

@endif
<x-mail::button :url="$url">
View their progress
</x-mail::button>

<small>You get this email because “Course completion” is on in your notification settings.</small>
</x-mail::message>
