<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesUploads;
use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\LockedContentDetail;
use App\Models\LockedContentFile;
use App\Models\LockedContentImage;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * Locked content ki hidden files + hidden images. Dono private disk pe rehte hain —
 * public page pe sirf ginti jaati hai, asli content payment ke baad hi milta hai.
 */
class LockedContentFileController extends Controller
{
    use RespondsFlexibly, HandlesUploads;

    private const MAX_FILES = 20;
    private const MAX_IMAGES = 20;

    public function store(Request $request, Product $lockedContent)
    {
        $request->validate([
            'files' => ['required', 'array', 'max:' . self::MAX_FILES],
            'files.*' => ['file', 'max:102400'],
        ]);

        $detail = $this->detail($lockedContent);

        if ($detail->files()->count() + count($request->file('files')) > self::MAX_FILES) {
            throw ValidationException::withMessages(['files' => 'You can add up to ' . self::MAX_FILES . ' hidden files.']);
        }

        $created = collect($request->file('files'))->map(fn ($file) => $detail->files()->create([
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
        $request->validate(['images' => ['required', 'array', 'max:10'], 'images.*' => ['image', 'max:10240']]);

        $detail = $this->detail($lockedContent);

        if ($detail->images()->count() + count($request->file('images')) > self::MAX_IMAGES) {
            throw ValidationException::withMessages(['images' => 'You can add up to ' . self::MAX_IMAGES . ' hidden images.']);
        }

        $order = (int) $detail->images()->max('sort_order');

        $created = collect($request->file('images'))->map(fn ($img) => $detail->images()->create([
            'image_path' => $this->putPrivate($img, 'locked'),
            'sort_order' => ++$order,
        ]));

        return $this->done($request, 'Images uploaded.', ['images' => $created], null, 201);
    }

    /** Creator ke editor thumbnails ke liye private image stream (binding tenant-scoped hai). */
    public function showImage(LockedContentImage $lockedContentImage)
    {
        $path = $lockedContentImage->image_path;

        if ($this->isPrivate($path)) {
            abort_unless(Storage::disk('local')->exists($path), 404);

            return Storage::disk('local')->response($path, null, ['Cache-Control' => 'private, max-age=3600']);
        }

        // purani images public assets disk pe hain
        return redirect('/assets/' . ltrim($path, '/'));
    }

    public function destroyImage(Request $request, LockedContentImage $lockedContentImage)
    {
        $path = $lockedContentImage->image_path;
        $this->isPrivate($path) ? $this->deletePrivate($path) : $this->deletePublic($path);
        $lockedContentImage->delete();

        return $this->done($request, 'Image removed.');
    }

    private function detail(Product $lockedContent): LockedContentDetail
    {
        return LockedContentDetail::firstOrCreate(['product_id' => $lockedContent->id], ['category' => 'other']);
    }

    /** putPrivate() `creators/{id}/...` me rakhta hai; purani public images `images/...` me hain. */
    private function isPrivate(string $path): bool
    {
        return str_starts_with($path, 'creators/');
    }
}
