{{-- Download links — [['label' => ..., 'url' => ...]]. Icon me file ka extension (PDF, ZIP…). --}}
@props(['files' => []])
<table class="files" width="100%" cellpadding="0" cellspacing="0" role="presentation">
@foreach ($files as $file)
@php($ext = \Illuminate\Support\Str::upper(\Illuminate\Support\Str::limit(pathinfo((string) ($file['label'] ?? ''), PATHINFO_EXTENSION) ?: pathinfo((string) parse_url((string) $file['url'], PHP_URL_PATH), PATHINFO_EXTENSION), 4, '')) ?: 'FILE')
<tr>
<td class="file-row"><span class="file-icon">{{ $ext }}</span><a href="{{ $file['url'] }}" class="file-link" target="_blank" rel="noopener">{{ $file['label'] ?? 'Download' }}</a></td>
<td class="file-row" align="right"><a href="{{ $file['url'] }}" class="file-action" target="_blank" rel="noopener">Download</a></td>
</tr>
@endforeach
</table>
