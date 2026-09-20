<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StorePageView extends Model
{
    use HasFactory;

    protected $table = 'store_page_views';


    public $timestamps = false;


    protected $fillable = [
        'store_id',
        'visitor_id',
        'page_path',
        'referrer',
        'viewed_at',
    ];


    protected $casts = [
        'viewed_at' => 'datetime',
    ];


    public function store()
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    public function visitor()
    {
        return $this->belongsTo(Visitor::class, 'visitor_id');
    }
}
