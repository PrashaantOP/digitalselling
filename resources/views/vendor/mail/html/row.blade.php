@props(['label', 'total' => false, 'last' => false])
<tr>
<td class="{{ $total ? 'row-total-label' : 'row-label' }}{{ $last ? ' row-last' : '' }}">{{ $label }}</td>
<td class="{{ $total ? 'row-total-value' : 'row-value' }}{{ $last ? ' row-last' : '' }}">{{ $slot }}</td>
</tr>
