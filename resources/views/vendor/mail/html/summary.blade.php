{{-- Details card — andar <x-mail::row> rows. Beech me khaali line mat chhodna, markdown HTML block tod deta hai. --}}
@props(['title' => null])
<table class="summary" width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td class="summary-inner">
<table class="summary-rows" width="100%" cellpadding="0" cellspacing="0" role="presentation">
@if ($title)
<tr>
<td colspan="2" class="summary-title">{{ $title }}</td>
</tr>
@endif
{!! $slot !!}
</table>
</td>
</tr>
</table>
