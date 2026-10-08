@props(['brand' => null, 'audience' => null, 'note' => null])
@php($brand = $brand ?: \App\Support\MailBrand::platform())
@php($support = config('billing.seller.email'))
<tr>
<td>
<table class="footer" align="center" width="600" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td class="content-cell" align="center">
@if ($note)
<p>{{ $note }}</p>
@endif
@if ($audience === 'creator')
<p><a href="{{ url('/dashboard/settings/notifications') }}">Manage email notifications</a></p>
@elseif ($audience === 'security')
<p>This is an account security email, so it is sent even when other notifications are off.</p>
@endif
@if ($audience === 'buyer')
<p>Sent on behalf of {{ $brand['name'] }} · Powered by <a href="{{ config('app.url') }}">{{ config('app.name') }}</a></p>
@elseif ($support)
<p>Questions? Write to <a href="mailto:{{ $support }}">{{ $support }}</a></p>
@endif
<p>© {{ date('Y') }} {{ config('app.name') }}</p>
{{ $slot }}
</td>
</tr>
</table>
</td>
</tr>
