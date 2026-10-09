{{-- Creator ka store (avatar / pehla akshar + naam) ya platform ka CreatorPro logo (public/images/brand/creatorpro-logo.png). --}}
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
{{-- CreatorPro logo (public/images/brand) — url() = APP_URL, isliye live pe https wala poora link. Image band ho to alt dikhta hai. --}}
<img src="{{ url('/images/brand/creatorpro-logo.png') }}" class="brand-logo" width="172" height="40" alt="{{ $brand['name'] }}">
@endif
</a>
</td>
</tr>
