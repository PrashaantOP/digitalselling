<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LessonNoteFile extends Model
{
    use HasFactory, HasUuid;

    protected $table = 'lesson_note_files';


    protected $fillable = [
        'lesson_note_id',
        'file_path',
        'original_name',
        'sort_order',
    ];


    /**
     * Browser ke andar kaise dikhe: 'pdf', 'text', ya null (doc/ppt/xls/zip — in-app nahi dikh sakte).
     * Extension stored file ka liya jaata hai (upload pe asli type se banta hai), buyer ke diye naam ka nahi.
     */
    public function viewKind(): ?string
    {
        return match (strtolower(pathinfo((string) $this->file_path, PATHINFO_EXTENSION))) {
            'pdf' => 'pdf',
            'txt' => 'text',
            default => null,
        };
    }

    public function note()
    {
        return $this->belongsTo(LessonNote::class, 'lesson_note_id');
    }
}
