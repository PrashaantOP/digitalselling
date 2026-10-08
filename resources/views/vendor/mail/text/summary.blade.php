@props(['title' => null])
@if ($title)
{{ $title }}
@endif
{{ $slot }}
