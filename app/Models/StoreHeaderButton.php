<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StoreHeaderButton extends Model
{
    use HasFactory;

    protected $table = 'store_header_buttons';


    protected $fillable = [
        'store_id',
        'label',
        'url',
        'icon',
        'sort_order',
    ];


    public function store()
    {
        return $this->belongsTo(Store::class, 'store_id');
    }
}
