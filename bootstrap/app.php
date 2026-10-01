<?php

use App\Http\Middleware\AdminIdleTimeout;
use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\EnsureAccountActive;
use App\Http\Middleware\EnsureAdminActive;
use App\Http\Middleware\EnsureOwnerCreator;
use App\Http\Middleware\EnsureProductTypePermission;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\SetTeamContext;
use App\Http\Middleware\TrackVisit;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            // Webhooks: NO 'web' middleware group => no CSRF/session, gateway can POST directly.
            Route::middleware([])->group(base_path('routes/webhooks.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware) {
        // 'vt' = our visitor-tracking cookie (TrackVisit middleware), must stay unencrypted.
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state', 'vt']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            SecurityHeaders::class,
            EnsureAccountActive::class,
        ]);

        // Custom route-middleware aliases used across routes/web.php + routes/public.php.
        $middleware->alias([
            'set.team.context' => SetTeamContext::class,
            'owner' => EnsureOwnerCreator::class,
            'perm' => CheckPermission::class,
            'perm.product' => EnsureProductTypePermission::class,
            'track.visit' => TrackVisit::class,
            'admin.active' => EnsureAdminActive::class,
            'admin.idle' => AdminIdleTimeout::class,
        ]);

        // /admin/* ka login page alag hai — creator login pe mat bhejo (aur ulta bhi)
        // customer portal (/me/*) ka bhi apna login hai — buyer ko creator login pe mat bhejo
        $middleware->redirectGuestsTo(fn (Request $request) => match (true) {
            $request->is('admin', 'admin/*') => '/admin/login',
            $request->is('me', 'me/*') => '/me/login',
            default => route('login'),
        });
        $middleware->redirectUsersTo(fn (Request $request) => match (true) {
            $request->is('admin', 'admin/*') => '/admin',
            $request->is('me', 'me/*') => '/me/courses',
            default => route('dashboard'),
        });
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
