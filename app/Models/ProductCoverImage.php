<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductCoverImage extends Model
{
    use HasFactory, HasUuid;

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
