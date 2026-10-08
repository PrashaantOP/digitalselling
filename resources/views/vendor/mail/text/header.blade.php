@props(['url', 'brand' => null])
{{ ($brand ?: \App\Support\MailBrand::platform())['name'] }}
