<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesUploads;
use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\LockedContentDetail;
use App\Models\LockedContentFile;
use App\Models\LockedContentImage;
use App\Models\Product;
use Illuminate\Http\Request;

/** Locked content: hidden files (private) + public teaser images. */
class LockedContentFileController extends Controller
{
    use RespondsFlexibly, HandlesUploads;

    public function store(Request $request, Product $lockedContent)
    {
        $request->validate([
            'files' => ['required', 'array', 'max:20'],
            'files.*' => ['file', 'max:204800'],
        ]);

        $detail = LockedContentDetail::firstOrCreate(['product_id' => $lockedContent->id], ['category' => 'other']);

        $created = collect($request->file('files'))->map(fn($file) => $detail->files()->create([
            'file_path' => $this->putPrivate($file, 'locked'),
            'original_name' => $file->getClientOriginalName(),
        ]));

        return $this->done($request, 'Files uploaded.', ['files' => $created], null, 201);
    }

    public function destroy(Request $request, LockedContentFile $lockedContentFile)
    {
        $this->deletePrivate($lockedContentFile->file_path);
        $lockedContentFile->delete();

        return $this->done($request, 'File removed.');
    }

    public function storeImage(Request $request, Product $lockedContent)
    {
        $request->validate(['images' => ['required', 'array', 'max:10'], 'images.*' => ['image', 'max:5120']]);

        $detail = LockedContentDetail::firstOrCreate(['product_id' => $lockedContent->id], ['category' => 'other']);
        $order = (int) $detail->images()->max('sort_order');

        $created = collect($request->file('images'))->map(fn($img) => $detail->images()->create([
            'image_path' => $this->putPublic($img, 'locked-content'),
            'sort_order' => ++$order,
        ]));

        return $this->done($request, 'Images uploaded.', ['images' => $created], null, 201);
    }

    public function destroyImage(Request $request, LockedContentImage $lockedContentImage)
    {
        $this->deletePublic($lockedContentImage->image_path);
        $lockedContentImage->delete();

        return $this->done($request, 'Image removed.');
    }
}
