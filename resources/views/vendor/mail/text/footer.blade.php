@props(['brand' => null, 'audience' => null, 'note' => null])
@php($brand = $brand ?: \App\Support\MailBrand::platform())
@if ($note)
{{ $note }}
@endif
@if ($audience === 'creator')
Manage email notifications: {{ url('/dashboard/settings/notifications') }}
@endif
@if ($audience === 'buyer')
Sent on behalf of {{ $brand['name'] }} · Powered by {{ config('app.name') }}
@elseif (config('billing.seller.email'))
Questions? Write to {{ config('billing.seller.email') }}
@endif
© {{ date('Y') }} {{ config('app.name') }}
{{ $slot }}
