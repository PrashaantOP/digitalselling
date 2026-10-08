{{-- Headline ke upar chhota chip. tone: primary | info | accent | plus | success | warning | danger | muted --}}
@props(['tone' => 'primary'])
<table class="badge-wrap" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td><span class="badge badge-{{ $tone }}">{{ $slot }}</span></td>
</tr>
</table>
