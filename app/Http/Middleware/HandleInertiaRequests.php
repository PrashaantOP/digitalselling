<?php

namespace App\Http\Middleware;

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
}
