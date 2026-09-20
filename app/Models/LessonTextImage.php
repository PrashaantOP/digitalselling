<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LessonTextImage extends Model
{
    use HasFactory;

    protected $table = 'lesson_text_images';


    protected $fillable = [
        'lesson_text_content_id',
        'image_path',
        'sort_order',
    ];


    public function textContent()
    {
        return $this->belongsTo(LessonTextContent::class, 'lesson_text_content_id');
    }
}
