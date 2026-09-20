<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KycVerification extends Model
{
    use HasFactory;

    protected $table = 'kyc_verifications';


    protected $fillable = [
        'user_id',
        'legal_name',
        'pan_number',
        'gst_number',
        'bank_account_holder',
        'bank_account_number',
        'ifsc',
        'id_document_path',
        'status',
        'rejection_reason',
        'submitted_at',
        'verified_at',
    ];


    protected $casts = [
        'submitted_at' => 'datetime',
        'verified_at' => 'datetime',
    ];


    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
