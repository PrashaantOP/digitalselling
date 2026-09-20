<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LessonNoteFile extends Model
{
    use HasFactory;

    protected $table = 'lesson_note_files';


    protected $fillable = [
        'lesson_note_id',
        'file_path',
        'original_name',
        'sort_order',
    ];


    public function note()
    {
        return $this->belongsTo(LessonNote::class, 'lesson_note_id');
    }
}
