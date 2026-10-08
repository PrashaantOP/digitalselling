@props(['brand' => null, 'preheader' => null, 'audience' => null, 'note' => null])
@php($brand = $brand ?: \App\Support\MailBrand::platform())
<x-mail::layout>
    {{-- Header --}}
    <x-slot:header>
        <x-mail::header :url="$brand['url']" :brand="$brand" />
    </x-slot:header>

    {{-- Body --}}
    {{ $slot }}

    {{-- Subcopy --}}
    @isset($subcopy)
        <x-slot:subcopy>
            <x-mail::subcopy>
                {{ $subcopy }}
            </x-mail::subcopy>
        </x-slot:subcopy>
    @endisset

    {{-- Footer --}}
    <x-slot:footer>
        <x-mail::footer :brand="$brand" :audience="$audience ?? ($brand['creator'] ? 'buyer' : null)" :note="$note" />
    </x-slot:footer>
</x-mail::layout>
