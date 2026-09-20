<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourseModule extends Model
{
    use HasFactory;

    protected $table = 'course_modules';


    protected $fillable = [
        'course_id',
        'title',
        'sort_order',
    ];


    public function course()
    {
        return $this->belongsTo(CourseDetail::class, 'course_id');
    }

    public function lessons()
    {
        return $this->hasMany(CourseLesson::class, 'module_id');
    }
}
