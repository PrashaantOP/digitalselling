<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Product;
use App\Models\ProductAddon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Shared — order bump / add-on: dusra apna product bundle mein jodna. */
class ProductAddonController extends Controller
{
    use RespondsFlexibly;

    public function store(Request $request, Product $product)
    {
        $data = $request->validate([
            'addon_product_id' => [
                'required', 'integer',
                Rule::exists('products', 'id')->where('creator_id', $this->tid())->whereNull('deleted_at'),
                Rule::notIn([$product->id]),
                Rule::unique('product_addons', 'addon_product_id')->where('product_id', $product->id),
            ],
        ]);

        $addon = $product->addons()->create($data);

        return $this->done($request, 'Add-on added.', ['addon' => $addon->load('addonProduct:id,title,type,price')], null, 201);
    }

    public function destroy(Request $request, ProductAddon $addon)
    {
        $addon->delete();

        return $this->done($request, 'Add-on removed.');
    }
}
