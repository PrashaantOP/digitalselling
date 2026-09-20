<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BookDownload extends Model
{
    use HasFactory;

    protected $table = 'book_downloads';


    public $timestamps = false;


    protected $fillable = [
        'book_id',
        'order_id',
        'downloaded_at',
    ];


    protected $casts = [
        'downloaded_at' => 'datetime',
    ];


    public function book()
    {
        return $this->belongsTo(BookDetail::class, 'book_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}
