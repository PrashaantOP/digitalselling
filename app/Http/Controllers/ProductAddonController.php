<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Product;
use App\Models\ProductAddon;
use App\Services\OrderService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Product ke add-ons (checkout pe "Add to your order"). Editor ka AddonsField inhi routes ko XHR se
 * call karta hai. Saare niyam yahin server pe lagte hain — screen sirf unhe dikhati hai.
 */
class ProductAddonController extends Controller
{
    use RespondsFlexibly;

    /**
     * Is product ke saath jo products add-on ban sakte hain: isi creator ke, published, allowed type,
     * tay daam wale (pay-what-you-want nahi), aur khud ye product nahi.
     */
    public static function eligible(Product $product): Builder
    {
        return Product::query()
            ->where('creator_id', $product->creator_id)
            ->where('status', 'published')
            ->whereIn('type', ProductAddon::TYPES)
            ->where('pricing_type', '!=', 'customer_decides')
            ->where('id', '!=', $product->id);
    }

    public function store(Request $request, Product $product)
    {
        $data = $request->validate([
            // URL/body me numeric id nahi — add-on product ka uuid
            'addon_product_uuid' => ['required', 'uuid'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
        ]);

        if (! in_array($product->type, ProductAddon::HOST_TYPES, true)) {
            throw ValidationException::withMessages(['addon_product_uuid' => 'Add-ons are not available for this kind of product.']);
        }

        $addonProduct = self::eligible($product)->where('uuid', $data['addon_product_uuid'])->first();

        if (! $addonProduct) {
            throw ValidationException::withMessages(['addon_product_uuid' => 'Choose one of your published e-books, courses, locked content or events.']);
        }

        if ($product->addons()->where('addon_product_id', $addonProduct->id)->exists()) {
            throw ValidationException::withMessages(['addon_product_uuid' => 'This product is already an add-on here.']);
        }

        if ($product->addons()->count() >= ProductAddon::MAX_PER_PRODUCT) {
            throw ValidationException::withMessages(['addon_product_uuid' => 'You can offer up to ' . ProductAddon::MAX_PER_PRODUCT . ' add-ons per product.']);
        }

        $addon = $product->addons()->create([
            'addon_product_id' => $addonProduct->id,
            'price' => $this->offerPrice($data['price'] ?? null, $addonProduct),
            'sort_order' => (int) $product->addons()->max('sort_order') + 1,
        ]);

        return $this->done($request, 'Add-on added.', ['addon' => $addon->setRelation('addonProduct', $addonProduct)->toEditorArray()], null, 201);
    }

    /** Sirf offer price badalna / hatana (null = product ka apna daam). */
    public function update(Request $request, ProductAddon $addon)
    {
        $data = $request->validate(['price' => ['nullable', 'numeric', 'min:0', 'max:1000000']]);

        $addon->load('addonProduct');
        abort_unless($addon->addonProduct, 404);

        $addon->update(['price' => $this->offerPrice($data['price'] ?? null, $addon->addonProduct)]);

        return $this->done($request, 'Add-on price saved.', ['addon' => $addon->toEditorArray()]);
    }

    public function destroy(Request $request, ProductAddon $addon)
    {
        $addon->delete();

        return $this->done($request, 'Add-on removed.');
    }

    /**
     * Offer price add-on ke normal daam se zyada nahi ho sakta (wo "offer" nahi rahega aur buyer zyada dega).
     * Normal daam ke barabar likha ho to offer nahi maana jaata — null save hota hai, taaki product ka
     * daam baad me badle to add-on ka bhi badle.
     */
    private function offerPrice(mixed $price, Product $addonProduct): ?float
    {
        if ($price === null || $price === '') {
            return null;
        }

        $price = round((float) $price, 2);
        $regular = OrderService::unitPrice($addonProduct);

        if ($price > $regular) {
            throw ValidationException::withMessages(['price' => 'The offer price cannot be more than the regular price (₹' . number_format($regular, 2) . ').']);
        }

        return $price === round($regular, 2) ? null : $price;
    }
}
