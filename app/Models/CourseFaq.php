<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourseFaq extends Model
{
    use HasFactory;

    protected $table = 'course_faqs';


    protected $fillable = [
        'course_id',
        'is_enabled',
        'question',
        'answer',
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
