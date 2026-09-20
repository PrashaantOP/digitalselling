<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StoreAppearance extends Model
{
    use HasFactory;

    protected $table = 'store_appearances';


    protected $fillable = [
        'store_id',
        'theme',
        'brand_color',
        'font_family',
        'custom_background_path',
    ];


    public function store()
    {
        return $this->belongsTo(Store::class, 'store_id');
    }
}
