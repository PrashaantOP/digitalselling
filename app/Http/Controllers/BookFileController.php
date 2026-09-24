<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesUploads;
use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\BookDetail;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** Book ki file upload ya Google Drive/external link save. File private disk pe rehti hai — sirf buyers download kar sakte hain. */
class BookFileController extends Controller
{
    use RespondsFlexibly, HandlesUploads;

    public function upload(Request $request, Product $book)
    {
        $data = $request->validate([
            // `mimes:` content sniff karta hai — asli .mobi files aksar octet-stream detect hoti hain aur reject ho jaati.
            // File private disk pe rehti hai aur sirf download (attachment) ki tarah milti hai, isliye extension check kaafi hai.
            'file' => ['nullable', 'file', 'extensions:pdf,epub,mobi,zip', 'max:102400'],
            'external_link' => ['nullable', 'url', 'max:500'],
            'remove_file' => ['sometimes', 'boolean'],
        ]);

        $detail = BookDetail::firstOrNew(['product_id' => $book->id]);

        if (! $request->hasFile('file') && empty($data['external_link']) && ! $request->boolean('remove_file')) {
            throw ValidationException::withMessages(['file' => 'Upload a file or provide a link.']);
        }

        if ($request->hasFile('file')) {
            $this->deletePrivate($detail->file_path);
            $file = $request->file('file');
            $detail->file_path = $this->putPrivate($file, 'books');
            $detail->format = in_array($ext = strtolower($file->getClientOriginalExtension()), ['pdf', 'epub', 'mobi', 'zip'], true) ? $ext : 'pdf';
            $detail->external_link = null;
        } elseif (! empty($data['external_link'])) {
            $this->deletePrivate($detail->file_path);
            $detail->file_path = null;
            $detail->external_link = $data['external_link'];
        } elseif ($request->boolean('remove_file')) {
            $this->deletePrivate($detail->file_path);
            $detail->file_path = null;
            $detail->external_link = null;
        }

        $detail->save();

        return $this->done($request, 'Book file saved.', [
            'has_file' => (bool) $detail->file_path,
            'external_link' => $detail->external_link,
            'format' => $detail->format,
        ]);
    }
}
