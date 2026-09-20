<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BookDetail extends Model
{
    use HasFactory;

    protected $table = 'book_details';


    protected $fillable = [
        'product_id',
        'author_name',
        'pages',
        'format',
        'file_path',
        'external_link',
    ];


    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function downloads()
    {
        return $this->hasMany(BookDownload::class, 'book_id');
    }
}
