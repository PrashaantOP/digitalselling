<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Course poora karne ka certificate. student_name / course_title / creator_name issue ke waqt ka
 * snapshot hain — live data se nahi padhe jaate. Design (logo, colour, template) creator ki
 * certificate_settings se aata hai aur snapshot nahi hota.
 */
class Certificate extends Model
{
    use HasFactory, HasUuid;

    protected $table = 'certificates';

    public $timestamps = false;

    protected $fillable = [
        'enrollment_id',
        'certificate_number',
        'student_name',
        'course_title',
        'creator_name',
        'file_path',
        'issued_at',
        'revoked_at',
        'revoke_reason',
    ];

    protected $casts = [
        'issued_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function enrollment()
    {
        return $this->belongsTo(Enrollment::class, 'enrollment_id');
    }

    public function isRevoked(): bool
    {
        return $this->revoked_at !== null;
    }
}
