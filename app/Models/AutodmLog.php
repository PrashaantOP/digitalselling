<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AutodmLog extends Model
{
    use HasFactory;

    protected $table = 'autodm_logs';


    public $timestamps = false;


    protected $fillable = [
        'rule_id',
        'instagram_username',
        'comment_text',
        'dm_sent',
        'triggered_at',
    ];


    protected $casts = [
        'dm_sent' => 'boolean',
        'triggered_at' => 'datetime',
    ];


    public function rule()
    {
        return $this->belongsTo(AutodmRule::class, 'rule_id');
    }
}
