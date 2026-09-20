<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderAddonItem extends Model
{
    use HasFactory;

    protected $table = 'order_addon_items';


    protected $fillable = [
        'order_id',
        'addon_product_id',
        'price',
    ];


    protected $casts = [
        'price' => 'decimal:2',
    ];


    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function addonProduct()
    {
        return $this->belongsTo(Product::class, 'addon_product_id');
    }
}
