<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Visitor extends Model
{
    use HasFactory;

    protected $table = 'visitors';


    public $timestamps = false;


    protected $fillable = [
        'store_id',
        'session_token',
        'phone',
        'name',
        'is_customer',
        'visits_count',
        'pages_count',
        'country',
        'city',
        'device',
        'browser',
        'first_seen_at',
        'last_seen_at',
    ];


    protected $casts = [
        'is_customer' => 'boolean',
        'first_seen_at' => 'datetime',
        'last_seen_at' => 'datetime',
    ];


    public function store()
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    public function pageViews()
    {
        return $this->hasMany(StorePageView::class, 'visitor_id');
    }

    public function linkClicks()
    {
        return $this->hasMany(StoreLinkClick::class, 'visitor_id');
    }
}
