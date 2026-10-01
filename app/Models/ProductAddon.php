<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Services\OrderService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Ek product ke saath checkout pe bikne wala doosra product ("Add to your order").
 * `price` creator ka offer price hai; NULL ho to add-on product ka apna daam lagta hai.
 */
class ProductAddon extends Model
{
    use HasFactory, HasUuid;

    protected $table = 'product_addons';

    /** Jo product add-on ban sakte hain. 1:1 session (slot chahiye) aur payment page (koi asset nahi) nahi. */
    public const TYPES = ['book', 'course', 'locked_content', 'event'];

    /** Jin products pe add-ons lag sakte hain — session ka checkout alag (slot wala) hai. */
    public const HOST_TYPES = ['course', 'book', 'locked_content', 'event', 'payment_page'];

    public const MAX_PER_PRODUCT = 5;

    protected $fillable = [
        'product_id',
        'addon_product_id',
        'price',
        'sort_order',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'sort_order' => 'integer',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function addonProduct()
    {
        return $this->belongsTo(Product::class, 'addon_product_id');
    }

    /** Buyer se jo liya jayega: offer price, warna add-on product ka apna daam. */
    public function effectivePrice(): float
    {
        return $this->price !== null ? (float) $this->price : OrderService::unitPrice($this->addonProduct);
    }

    /** Dashboard editor aur API responses ka ek hi shape. */
    public function toEditorArray(): array
    {
        $product = $this->addonProduct;

        return [
            'uuid' => $this->uuid,
            'price' => $this->price !== null ? (float) $this->price : null,
            'effective_price' => $product ? $this->effectivePrice() : 0.0,
            'product' => $product ? [
                'uuid' => $product->uuid,
                'title' => $product->title,
                'type' => $product->type,
                'status' => $product->status,
                'unit_price' => OrderService::unitPrice($product),
            ] : null,
        ];
    }
}
