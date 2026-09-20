<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LockedContentDetail extends Model
{
    use HasFactory;

    protected $table = 'locked_content_details';


    protected $fillable = [
        'product_id',
        'category',
        'public_teaser',
        'hidden_message',
        'hidden_video_url',
    ];


    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function images()
    {
        return $this->hasMany(LockedContentImage::class, 'locked_content_id');
    }

    public function files()
    {
        return $this->hasMany(LockedContentFile::class, 'locked_content_id');
    }

    public function unlocks()
    {
        return $this->hasMany(LockedContentUnlock::class, 'locked_content_id');
    }
}
