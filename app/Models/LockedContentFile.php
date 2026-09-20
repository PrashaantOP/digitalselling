<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LockedContentFile extends Model
{
    use HasFactory;

    protected $table = 'locked_content_files';


    protected $fillable = [
        'locked_content_id',
        'file_path',
        'original_name',
    ];


    public function lockedContent()
    {
        return $this->belongsTo(LockedContentDetail::class, 'locked_content_id');
    }
}
