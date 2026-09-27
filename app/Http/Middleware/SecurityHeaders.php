<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

/**
 * Har web response pe security headers.
 *
 * CSP: admin panel (/admin) pe ENFORCE — wahi page sabse keemti hai aur same origin pe hai. Baaki (creator
 * dashboard + public pages) pe abhi REPORT-ONLY: browser console me violations dikhte hain, kuch block
 * nahi hota. Kuch din violations dekh ke wahan bhi enforce karna hai.
 * Inline scripts (dark-mode bootstrap, Ziggy @routes, Vite) nonce se chalte hain — app.blade.php dekho.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        // view render hone se pehle nonce banana zaroori hai (@vite / @routes isi ko use karte hain)
        $nonce = Vite::useCspNonce();
        $isAdmin = $request->is('admin', 'admin/*');

        $response = $next($request);
        $headers = $response->headers;

        // clickjacking: dusri site hamare page iframe me nahi daal sakti
        $headers->set('X-Frame-Options', $isAdmin ? 'DENY' : 'SAMEORIGIN');
        $headers->set('X-Content-Type-Options', 'nosniff');
        $headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        if (app()->isProduction() && $request->isSecure()) {
            $headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        $headers->set($isAdmin ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only', $this->policy($nonce, $isAdmin));

        // admin pages browser/proxy cache me na rahein, search engines index na karein
        if ($isAdmin) {
            $headers->set('Cache-Control', 'no-store, private');
            $headers->set('X-Robots-Tag', 'noindex, nofollow');
        }

        return $response;
    }

    private function policy(string $nonce, bool $admin): string
    {
        [$dev, $devWs] = $this->viteDevOrigins();

        $directives = [
            'default-src' => ["'self'"],
            'script-src' => ["'self'", "'nonce-{$nonce}'", $dev, ...($admin ? [] : ['https://checkout.razorpay.com'])],
            // React style={} attributes ke liye inline styles chahiye
            'style-src' => ["'self'", "'unsafe-inline'", 'https://fonts.bunny.net', ...($admin ? [] : ['https://fonts.googleapis.com']), $dev],
            'font-src' => ["'self'", 'data:', 'https://fonts.bunny.net', ...($admin ? [] : ['https://fonts.gstatic.com'])],
            'img-src' => ["'self'", 'data:', 'blob:', ...($admin ? [] : ['https:'])],
            'media-src' => ["'self'", 'blob:', ...($admin ? [] : ['https:'])],
            'connect-src' => ["'self'", $dev, $devWs],
            'frame-src' => $admin ? ["'none'"] : ['https://www.youtube.com', 'https://www.youtube-nocookie.com', 'https://player.vimeo.com', 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
            'frame-ancestors' => [$admin ? "'none'" : "'self'"],
            'form-action' => ["'self'"],
            'base-uri' => ["'self'"],
            'object-src' => ["'none'"],
        ];

        return collect($directives)
            ->map(fn (array $sources, string $name) => $name . ' ' . implode(' ', array_filter($sources)))
            ->implode('; ');
    }

    /** `npm run dev` chal raha ho to Vite server (http + ws) allow — warna local pe page toot jaata. */
    private function viteDevOrigins(): array
    {
        $hot = public_path('hot');

        if (! is_file($hot)) {
            return [null, null];
        }

        $origin = rtrim(trim((string) file_get_contents($hot)), '/');

        return [$origin, preg_replace('#^http#', 'ws', $origin)];
    }
}
