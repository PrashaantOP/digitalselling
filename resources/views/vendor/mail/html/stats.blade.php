{{-- 2-2 ke tiles — [['label' => 'Sales', 'value' => '12'], ...] --}}
@props(['items' => []])
<table class="stats" width="100%" cellpadding="0" cellspacing="0" role="presentation">
@foreach (array_chunk($items, 2) as $i => $pair)
@if ($i > 0)
<tr><td colspan="3" class="stat-row-gap">&nbsp;</td></tr>
@endif
<tr>
@foreach ($pair as $j => $item)
@if ($j > 0)
<td class="stat-gap">&nbsp;</td>
@endif
<td class="stat"><div class="stat-label">{{ $item['label'] }}</div><div class="stat-value">{{ $item['value'] }}</div></td>
@endforeach
@if (count($pair) === 1)
<td class="stat-gap">&nbsp;</td><td>&nbsp;</td>
@endif
</tr>
@endforeach
</table>
