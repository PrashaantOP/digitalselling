<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($darkScope ?? false) && ($appearance ?? 'light') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

        {{-- Dark sirf dashboard pe. 'system' ho to pehli paint se pehle hi device ka rang (safed flash nahi) --}}
        <script nonce="{{ Vite::cspNonce() }}">
            (function() {
                const appearance = '{{ $appearance ?? "light" }}';
                const dashboard = /^\/(dashboard|settings)(\/|$)/.test(window.location.pathname);

                if (dashboard && appearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: #0f0f14;
            }
        </style>

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        {{-- CreatorPro brand icons — files public/ me (source: public/images/brand/source) --}}
        <link rel="icon" href="/favicon.ico" sizes="48x48">
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        {{-- PWA: sirf creator webapp (/w/{username}) pe. Manifest ek PHP route hai aur sw.js/sw-register.js
             plain static files — isliye shared hosting pe koi server config nahi chahiye. --}}
        @if (($page['component'] ?? null) === 'Public/Webapp')
            @php($webappUsername = $page['props']['creator']['username'] ?? null)
            @if ($webappUsername)
                <link rel="manifest" href="/w/{{ $webappUsername }}/manifest.webmanifest">
            @endif
            <meta name="mobile-web-app-capable" content="yes">
            <meta name="apple-mobile-web-app-capable" content="yes">
            <meta name="apple-mobile-web-app-status-bar-style" content="default">
            <link rel="apple-touch-icon" href="/pwa/icon-192.png">
            <script src="/sw-register.js" defer></script>
        @endif

        @routes(nonce: Vite::cspNonce())
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
