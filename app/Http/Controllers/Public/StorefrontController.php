<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Inertia\Inertia;

/** GET /{username} — creator ki public store. */
class StorefrontController extends Controller
{
    public const PREFIX = ['course' => 'c', 'event' => 'e', 'book' => 'b', 'locked_content' => 'l', 'payment_page' => 'p'];

    public function show(string $username)
    {
        $creator = User::where('username', $username)->where('role', 'creator')->where('status', 'active')->firstOrFail();

        $store = Store::with(['appearance', 'socialLinks' => fn ($q) => $q->orderBy('sort_order'), 'headerButtons' => fn ($q) => $q->orderBy('sort_order')])
            ->where('user_id', $creator->id)->firstOrFail();

        // store live nahi to page dikhana nahi (owner preview dashboard se hota hai)
        abort_unless($store->is_live, 404);

        $products = Product::with('coverImages:id,product_id,image_path,sort_order')
            ->where('creator_id', $creator->id)->where('status', 'published')
            ->whereIn('type', array_merge(array_keys(self::PREFIX), ['booking']))
            ->latest('published_at')->get()
            ->map(fn (Product $p) => [
                'id' => $p->id,
                'type' => $p->type,
                'title' => $p->title,
                'description' => str($p->description)->stripTags()->limit(140)->toString(),
                'pricing_type' => $p->pricing_type,
                'price' => $p->price,
                'has_discount' => $p->has_discount,
                'discounted_price' => $p->discounted_price,
                'button_text' => $p->button_text,
                'cover' => $p->coverImages->sortBy('sort_order')->first()?->image_path,
                'url' => $p->type === 'booking' ? url("/book/{$creator->username}") : url('/' . self::PREFIX[$p->type] . '/' . $p->slug),
            ]);

        return Inertia::render('Public/Storefront', [
            'creator' => $creator->only(['name', 'username', 'avatar']),
            'store' => $store->only(['display_name', 'bio', 'avatar', 'welcome_message', 'header_heading', 'column_layout',
                'sensitive_content_warning', 'meta_title', 'meta_description', 'fb_pixel_id', 'ga_tracking_id']),
            'appearance' => $store->appearance,
            'socialLinks' => $store->socialLinks,
            'headerButtons' => $store->headerButtons,
            'products' => $products,
        ]);
    }
}
