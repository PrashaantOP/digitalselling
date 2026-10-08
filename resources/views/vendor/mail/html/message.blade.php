{{--
 | Har mail ka dhaancha. Props:
 |  brand     — App\Support\MailBrand array (na ho to platform)
 |  preheader — inbox preview line
 |  audience  — buyer | creator | security (footer ki lines; creator brand ho to default buyer)
 |  note      — footer me "ye mail kyun mila"
--}}
@props(['brand' => null, 'preheader' => null, 'audience' => null, 'note' => null])
@php($brand = $brand ?: \App\Support\MailBrand::platform())
<x-mail::layout :preheader="$preheader">
{{-- Header --}}
<x-slot:header>
<x-mail::header :url="$brand['url']" :brand="$brand" />
</x-slot:header>

{{-- Body --}}
{!! $slot !!}

{{-- Subcopy --}}
@isset($subcopy)
<x-slot:subcopy>
<x-mail::subcopy>
{!! $subcopy !!}
</x-mail::subcopy>
</x-slot:subcopy>
@endisset

{{-- Footer --}}
<x-slot:footer>
<x-mail::footer :brand="$brand" :audience="$audience ?? ($brand['creator'] ? 'buyer' : null)" :note="$note" />
</x-slot:footer>
</x-mail::layout>
