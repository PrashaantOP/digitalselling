<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StoreSocialLinkController extends Controller
{
    use RespondsFlexibly;

    /**
     * Bulk upsert: body => links: [{platform, url}, ...]
     * Jo platform list me nahi hai wo delete ho jaata hai; empty url wali entry bhi hat jaati hai.
     */
    public function update(Request $request)
    {
        $data = $request->validate([
            'links' => ['present', 'array', 'max:15'],
            'links.*.platform' => ['required', Rule::in(['instagram', 'youtube', 'x', 'website', 'whatsapp', 'telegram'])],
            'links.*.url' => ['nullable', 'url', 'max:500'],
        ]);

        $store = StoreController::storeFor($this->tid());

        $links = collect($data['links'])->filter(fn ($l) => ! empty($l['url']))->unique('platform')->values();

        DB::transaction(function () use ($store, $links) {
            $store->socialLinks()->whereNotIn('platform', $links->pluck('platform'))->delete();

            foreach ($links as $i => $link) {
                $store->socialLinks()->updateOrCreate(
                    ['platform' => $link['platform']],
                    ['url' => $link['url'], 'sort_order' => $i]
                );
            }
        });

        return $this->done($request, 'Social links saved.', ['links' => $store->socialLinks()->orderBy('sort_order')->get()]);
    }
}
