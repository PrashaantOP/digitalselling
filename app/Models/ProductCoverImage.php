<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductCoverImage extends Model
{
    use HasFactory;

    protected $table = 'product_cover_images';


    protected $fillable = [
        'product_id',
        'image_path',
        'sort_order',
    ];


    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
