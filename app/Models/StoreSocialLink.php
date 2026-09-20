<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StoreSocialLink extends Model
{
    use HasFactory;

    protected $table = 'store_social_links';


    protected $fillable = [
        'store_id',
        'platform',
        'url',
        'sort_order',
    ];


    public function store()
    {
        return $this->belongsTo(Store::class, 'store_id');
    }
}
