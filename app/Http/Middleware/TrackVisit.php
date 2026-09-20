<?php

namespace App\Http\Middleware;

use App\Models\Product;
use App\Models\Store;
use App\Models\StorePageView;
use App\Models\User;
use App\Models\Visitor;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * alias: track.visit — public storefront / checkout pages pe visitor + page view record karta hai.
 * Store kaise pata chalta hai: route me `username` ho (storefront/booking page) ya `slug` ho (product page).
 * Response ke baad chalta hai (terminate) taaki page slow na ho.
 */
class TrackVisit
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->cookie('vt') ?: (string) Str::uuid();
        $request->attributes->set('visitor_token', $token);

        $response = $next($request);

        if ($request->isMethod('GET') && $response->isSuccessful()) {
            $response->headers->setCookie(cookie('vt', $token, 60 * 24 * 365, '/', null, $request->isSecure(), true, false, 'Lax'));
        }

        return $response;
    }

    public function terminate(Request $request, $response): void
    {
        if (! $request->isMethod('GET') || ! $response->isSuccessful() || $request->expectsJson()) {
            return;
        }

        try {
            $store = $this->resolveStore($request);
            $token = $request->attributes->get('visitor_token');

            if (! $store || ! $token) {
                return;
            }

            $visitor = Visitor::where('store_id', $store->id)->where('session_token', $token)->first();

            if ($visitor) {
                $visitor->increment('pages_count');
                // naya session (30 min se zyada gap) => naya visit
                if ($visitor->last_seen_at && $visitor->last_seen_at->lt(now()->subMinutes(30))) {
                    $visitor->increment('visits_count');
                }
                $visitor->update(['last_seen_at' => now()]);
            } else {
                [$device, $browser] = $this->parseAgent((string) $request->userAgent());

                $visitor = Visitor::create([
                    'store_id' => $store->id,
                    'session_token' => $token,
                    'device' => $device,
                    'browser' => $browser,
                    'country' => $request->header('CF-IPCountry'),
                ]);
            }

            StorePageView::create([
                'store_id' => $store->id,
                'visitor_id' => $visitor->id,
                'page_path' => '/' . ltrim($request->path(), '/'),
                'referrer' => Str::limit((string) $request->headers->get('referer'), 250, ''),
            ]);
        } catch (\Throwable $e) {
            report($e); // tracking kabhi page nahi todna chahiye
        }
    }

    private function resolveStore(Request $request): ?Store
    {
        if ($username = $request->route('username')) {
            $creatorId = User::where('username', $username)->where('role', 'creator')->value('id');
        } elseif ($slug = $request->route('slug')) {
            $creatorId = Product::where('slug', $slug)->value('creator_id');
        }

        return isset($creatorId) && $creatorId ? Store::where('user_id', $creatorId)->first() : null;
    }

    private function parseAgent(string $ua): array
    {
        $device = preg_match('/mobile|android|iphone/i', $ua) ? 'mobile' : (preg_match('/ipad|tablet/i', $ua) ? 'tablet' : 'desktop');

        $browser = match (true) {
            (bool) preg_match('/edg/i', $ua) => 'Edge',
            (bool) preg_match('/chrome|crios/i', $ua) => 'Chrome',
            (bool) preg_match('/firefox|fxios/i', $ua) => 'Firefox',
            (bool) preg_match('/safari/i', $ua) => 'Safari',
            default => 'Other',
        };

        return [$device, $browser];
    }
}
