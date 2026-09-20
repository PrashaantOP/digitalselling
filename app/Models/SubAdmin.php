<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SubAdmin extends Model
{
    use HasFactory;

    protected $table = 'sub_admins';


    protected $fillable = [
        'creator_id',
        'user_id',
        'email',
        'status',
        'role_name',
        'invite_token',
        'invited_at',
        'accepted_at',
    ];


    protected $casts = [
        'invited_at' => 'datetime',
        'accepted_at' => 'datetime',
    ];


    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
