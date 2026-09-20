<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesUploads;
use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Product;
use App\Models\ProductCoverImage;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** Shared — product cover gallery (max 8 images). */
class ProductCoverImageController extends Controller
{
    use RespondsFlexibly, HandlesUploads;

    private const MAX = 8;

    public function store(Request $request, Product $product)
    {
        $request->validate([
            'images' => ['required', 'array', 'min:1', 'max:' . self::MAX],
            'images.*' => ['image', 'max:5120'],
        ]);

        if ($product->coverImages()->count() + count($request->file('images')) > self::MAX) {
            throw ValidationException::withMessages(['images' => 'A product can have up to ' . self::MAX . ' cover images.']);
        }

        $order = (int) $product->coverImages()->max('sort_order');

        $created = collect($request->file('images'))->map(fn ($img) => $product->coverImages()->create([
            'image_path' => $this->putPublic($img, 'covers'),
            'sort_order' => ++$order,
        ]));

        return $this->done($request, 'Images uploaded.', ['images' => $created], null, 201);
    }

    public function destroy(Request $request, ProductCoverImage $coverImage)
    {
        $this->deletePublic($coverImage->image_path);
        $coverImage->delete();

        return $this->done($request, 'Image removed.');
    }
}
