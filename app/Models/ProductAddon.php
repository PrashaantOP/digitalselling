<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductAddon extends Model
{
    use HasFactory, HasUuid;

    protected $table = 'product_addons';


    protected $fillable = [
        'product_id',
        'addon_product_id',
    ];


    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function addonProduct()
    {
        return $this->belongsTo(Product::class, 'addon_product_id');
    }
}
