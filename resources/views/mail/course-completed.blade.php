<x-mail::message audience="creator" :preheader="$student . ' finished ' . $title" note="You get this email because “Course completion” is on in your notification settings.">
<x-mail::badge tone="success">Course completed 🎉</x-mail::badge>

# {{ $student }} finished your course

Hi {{ $name }}, **{{ $student }}** just completed **{{ $title }}**.

<x-mail::summary>
<x-mail::row label="Student">{{ $student }}</x-mail::row>
<x-mail::row label="Course">{{ $title }}</x-mail::row>
<x-mail::row label="Certificate">{{ $certificate ? 'Issued automatically with your design' : 'Off for this course' }}</x-mail::row>
</x-mail::summary>

<x-mail::button :url="$url">
View their progress
</x-mail::button>
</x-mail::message>
