{{-- Creator ka store (avatar / pehla akshar + naam) ya platform wordmark. PNG logo lagana ho to platform wali branch me <img> yahin. --}}
@props(['url', 'brand' => null])
@php($brand = $brand ?: \App\Support\MailBrand::platform())
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block; text-decoration: none;">
@if ($brand['creator'])
@if ($brand['avatar_url'])
<img src="{{ $brand['avatar_url'] }}" class="brand-avatar" width="48" height="48" alt="{{ $brand['name'] }}">
@else
<span class="brand-initial">{{ $brand['initial'] }}</span><br>
@endif
<span class="brand-name">{{ $brand['name'] }}</span>
@else
<span class="brand-mark">{{ $brand['initial'] }}</span>&nbsp;&nbsp;<span class="brand-name">{{ $brand['name'] }}</span>
@endif
</a>
</td>
</tr>
