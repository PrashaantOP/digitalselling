@props(['files' => []])
@foreach ($files as $file)
{{ $file['label'] ?? 'Download' }}: {{ $file['url'] }}
@endforeach
