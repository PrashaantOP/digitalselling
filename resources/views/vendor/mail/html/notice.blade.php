{{-- Rangeen note box. tone: info | success | warning | danger. Andar markdown (**bold**, links) chalta hai. --}}
@props(['tone' => 'info'])
<table class="notice-box" width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td class="notice notice-{{ $tone }}">
{{ Illuminate\Mail\Markdown::parse($slot) }}
</td>
</tr>
</table>
