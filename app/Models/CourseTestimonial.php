<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourseTestimonial extends Model
{
    use HasFactory;

    protected $table = 'course_testimonials';


    protected $fillable = [
        'course_id',
        'is_enabled',
        'name',
        'message',
        'avatar_path',
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
