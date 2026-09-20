<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LockedContentImage extends Model
{
    use HasFactory;

    protected $table = 'locked_content_images';


    protected $fillable = [
        'locked_content_id',
        'image_path',
        'sort_order',
    ];


    public function lockedContent()
    {
        return $this->belongsTo(LockedContentDetail::class, 'locked_content_id');
    }
}
