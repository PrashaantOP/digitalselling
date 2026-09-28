<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\StoreAppearance;
use App\Support\PlanPricing;
use App\Support\Tenant;
use App\Support\WebappPayload;
use App\Support\WebappThemes;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Dashboard → Web App: creator apne webapp (/w/{username}) ka design chunta hai.
 * Koi customization nahi — branding store profile se hi aati hai, yahan sirf theme.
 */
class WebappController extends Controller
{
    use RespondsFlexibly;

    public function edit()
    {
        $store = StoreController::storeFor($this->tid());
        $creator = Tenant::creator();
        $store->load(['appearance', 'socialLinks' => fn ($q) => $q->orderBy('sort_order')]);

        return Inertia::render('Webapp/Index', [
            'themes' => WebappThemes::forCreator($creator),
            'isPro' => PlanPricing::effectivePlan($creator) === 'pro',
            'isLive' => (bool) $store->is_live,
            'preview' => WebappPayload::for($creator, $store),
        ]);
    }

    public function update(Request $request)
    {
        $creator = Tenant::creator();

        $data = $request->validate([
            'theme' => ['required', 'string', Rule::in(WebappThemes::slugs())],
        ]);

        // Rule::in sirf slug valid hai ye dekhta hai — plan ka gate yahan lagta hai
        if (! in_array($data['theme'], WebappThemes::allowedFor($creator), true)) {
            throw ValidationException::withMessages(['theme' => 'This design is available on the Pro plan.']);
        }

        $store = StoreController::storeFor($this->tid());
        StoreAppearance::firstOrNew(['store_id' => $store->id])
            ->fill(['webapp_theme' => $data['theme']])
            ->save();

        return $this->done($request, WebappThemes::ALL[$data['theme']]['name'] . ' theme applied.', ['theme' => $data['theme']]);
    }
}
