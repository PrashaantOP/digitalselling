<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\BookDetail;
use App\Models\BookDownload;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BookDownloadController extends Controller
{
    use ResolvesCustomer;

    /** GET /me/books/{bookId}/download — bookId = products.id (type=book). Sirf buyer (ya add-on buyer). */
    public function download(int $bookId)
    {
        $product = Product::where('type', 'book')->findOrFail($bookId);

        $order = Order::whereIn('customer_id', $this->customerIds())->where('status', 'success')
            ->where(fn ($q) => $q->where('product_id', $product->id)
                ->orWhereHas('addonItems', fn ($a) => $a->where('addon_product_id', $product->id)))
            ->latest('paid_at')->first();

        abort_unless($order, 403, 'Purchase this book to download it.');

        $detail = BookDetail::where('product_id', $product->id)->firstOrFail();

        BookDownload::create(['book_id' => $detail->id, 'order_id' => $order->id, 'downloaded_at' => now()]);

        if ($detail->file_path && Storage::disk('local')->exists($detail->file_path)) {
            $ext = pathinfo($detail->file_path, PATHINFO_EXTENSION);

            return Storage::disk('local')->download($detail->file_path, Str::slug($product->title) . '.' . $ext);
        }

        abort_unless($detail->external_link, 404);

        return redirect()->away($detail->external_link);
    }
}
