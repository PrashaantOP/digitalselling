<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Certificate extends Model
{
    use HasFactory;

    protected $table = 'certificates';


    public $timestamps = false;


    protected $fillable = [
        'enrollment_id',
        'certificate_number',
        'file_path',
        'issued_at',
    ];


    protected $casts = [
        'issued_at' => 'datetime',
    ];


    public function enrollment()
    {
        return $this->belongsTo(Enrollment::class, 'enrollment_id');
    }
}
