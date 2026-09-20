<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourseHighlight extends Model
{
    use HasFactory;

    protected $table = 'course_highlights';


    protected $fillable = [
        'course_id',
        'is_enabled',
        'text',
        'sort_order',
    ];


    protected $casts = [
        'is_enabled' => 'boolean',
    ];


    public function course()
    {
        return $this->belongsTo(CourseDetail::class, 'course_id');
    }
}
