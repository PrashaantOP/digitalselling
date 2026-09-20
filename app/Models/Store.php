<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Store extends Model
{
    use HasFactory;

    protected $table = 'stores';


    protected $fillable = [
        'user_id',
        'display_name',
        'bio',
        'avatar',
        'welcome_message',
        'header_heading',
        'is_live',
        'column_layout',
        'sensitive_content_warning',
        'meta_title',
        'meta_description',
        'fb_pixel_id',
        'ga_tracking_id',
    ];


    protected $casts = [
        'is_live' => 'boolean',
        'sensitive_content_warning' => 'boolean',
    ];


    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function appearance()
    {
        return $this->hasOne(StoreAppearance::class, 'store_id');
    }

    public function socialLinks()
    {
        return $this->hasMany(StoreSocialLink::class, 'store_id');
    }

    public function headerButtons()
    {
        return $this->hasMany(StoreHeaderButton::class, 'store_id');
    }

    public function visitors()
    {
        return $this->hasMany(Visitor::class, 'store_id');
    }

    public function pageViews()
    {
        return $this->hasMany(StorePageView::class, 'store_id');
    }

    public function linkClicks()
    {
        return $this->hasMany(StoreLinkClick::class, 'store_id');
    }
}
