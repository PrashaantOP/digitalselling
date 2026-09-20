<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LockedContentUnlock extends Model
{
    use HasFactory;

    protected $table = 'locked_content_unlocks';


    public $timestamps = false;


    protected $fillable = [
        'locked_content_id',
        'order_id',
        'unlocked_at',
    ];


    protected $casts = [
        'unlocked_at' => 'datetime',
    ];


    public function lockedContent()
    {
        return $this->belongsTo(LockedContentDetail::class, 'locked_content_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}
