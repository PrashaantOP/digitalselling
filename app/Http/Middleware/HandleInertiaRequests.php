<?php

namespace App\Http\Middleware;

use App\Support\PlanPricing;
use App\Support\TeamAccess;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        // Admin panel: sirf admin ki pehchaan — creator ka session/user (agar same browser me ho) kabhi share nahi
        if ($request->is('admin', 'admin/*')) {
            $admin = Auth::guard('admin')->user();

            return [
                ...parent::share($request),
                'name' => config('app.name'),
                'admin' => $admin?->only(['uuid', 'name', 'email']),
                'flash' => ['status' => fn () => $request->session()->get('status')],
            ];
        }

        // Customer portal + pay ke baad wala page: sirf buyer ki pehchaan — creator ka `auth` (same browser me login ho to) kabhi nahi
        if ($request->is('me', 'me/*', 'checkout/done/*')) {
            $buyer = Auth::guard('customer')->user();

            return [
                ...parent::share($request),
                'name' => config('app.name'),
                'buyer' => $buyer?->only(['name', 'email']),
                'flash' => ['status' => fn () => $request->session()->get('status')],
            ];
        }

        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            // creator side: hamesha `web` guard — admin guard ka user kabhi yahan share na ho
            'auth' => [
                'user' => $request->user('web'),
                'isOwner' => (bool) $request->user('web')?->isCreator(),
                // owner = ['*']; sub-admin = uske role ki permissions (sidebar / buttons chhupane ke liye)
                'permissions' => fn () => $request->user('web') ? TeamAccess::permissions($request->user('web')) : [],
                // sub-admin kis store me kaam kar raha hai — sirf naam
                'storeOwner' => fn () => $request->user('web')?->isSubAdmin() ? $request->user('web')->parentCreator?->name : null,
                // store ka plan (sub-admin ke liye owner ka) — sidebar ka plan card isi se chalta hai
                'plan' => fn () => $this->plan($request),
            ],
            'ziggy' => fn (): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            // RespondsFlexibly::done() ka "…saved" message
            'flash' => ['success' => fn () => $request->session()->get('success')],
        ];
    }

    /** @return array{effective: string, commission_rate: float, expires_at: ?string}|null */
    private function plan(Request $request): ?array
    {
        $user = $request->user('web');
        $creator = $user?->isSubAdmin() ? $user->parentCreator : $user;

        if (! $creator?->isCreator()) {
            return null;
        }

        $effective = PlanPricing::effectivePlan($creator);

        return [
            'effective' => $effective,
            'commission_rate' => PlanPricing::commissionRate($creator),
            'expires_at' => $effective === 'pro' ? $creator->plan_expires_at?->toIso8601String() : null,
        ];
    }
}
