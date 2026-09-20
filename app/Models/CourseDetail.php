<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourseDetail extends Model
{
    use HasFactory;

    protected $table = 'course_details';


    protected $fillable = [
        'product_id',
        'access_type',
        'access_days',
        'certificate_enabled',
        'total_lessons',
    ];


    protected $casts = [
        'certificate_enabled' => 'boolean',
    ];


    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function modules()
    {
        return $this->hasMany(CourseModule::class, 'course_id');
    }

    public function enrollments()
    {
        return $this->hasMany(Enrollment::class, 'course_id');
    }

    public function instructions()
    {
        return $this->hasMany(CourseInstruction::class, 'course_id');
    }

    public function benefits()
    {
        return $this->hasMany(CourseBenefit::class, 'course_id');
    }

    public function galleryItems()
    {
        return $this->hasMany(CourseGalleryItem::class, 'course_id');
    }

    public function faqs()
    {
        return $this->hasMany(CourseFaq::class, 'course_id');
    }

    public function testimonials()
    {
        return $this->hasMany(CourseTestimonial::class, 'course_id');
    }

    public function highlights()
    {
        return $this->hasMany(CourseHighlight::class, 'course_id');
    }

    public function liveClasses()
    {
        return $this->hasMany(LiveClass::class, 'course_id');
    }
}
