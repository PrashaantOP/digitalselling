<?php

namespace App\Support;

use App\Http\Controllers\Public\StorefrontController;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Creator ke public products ki ek hi list — store (/username), webapp (/w/username)
 * aur dashboard ka live preview teeno yahi use karte hain, taaki preview == live.
 */
class StorefrontCatalog
{
    public static function for(User $creator): Collection
    {
        return Product::with(['coverImages:id,product_id,image_path,sort_order', 'bookingServiceDetail'])
            ->where('creator_id', $creator->id)->where('status', 'published')
            ->whereIn('type', array_merge(array_keys(StorefrontController::PREFIX), ['booking']))
            // band (inactive) session store pe nahi dikhna chahiye — booking page bhi use 404 karta hai
            ->where(fn ($q) => $q->where('type', '!=', 'booking')
                ->orWhereHas('bookingServiceDetail', fn ($d) => $d->where('is_active', true)))
            ->latest('published_at')->get()
            ->map(fn (Product $p) => [
                'id' => $p->id,
                'type' => $p->type,
                'title' => $p->title,
                'slug' => $p->slug,
                'description' => str($p->description)->stripTags()->limit(140)->toString(),
                'pricing_type' => $p->pricing_type,
                'price' => $p->price,
                'has_discount' => $p->has_discount,
                'discounted_price' => $p->discounted_price,
                'button_text' => $p->button_text,
                'cover' => $p->coverImages->sortBy('sort_order')->first()?->image_path,
                'duration_minutes' => $p->type === 'booking' ? $p->bookingServiceDetail?->duration_minutes : null,
                'url' => $p->type === 'booking'
                    ? url("/book/{$creator->username}") . '?service=' . urlencode($p->slug)
                    : url('/' . StorefrontController::PREFIX[$p->type] . '/' . $p->slug),
            ])->values();
    }
}
