<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StoreLinkClick extends Model
{
    use HasFactory;

    protected $table = 'store_link_clicks';


    public $timestamps = false;


    protected $fillable = [
        'store_id',
        'visitor_id',
        'element_label',
        'clicked_at',
    ];


    protected $casts = [
        'clicked_at' => 'datetime',
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
