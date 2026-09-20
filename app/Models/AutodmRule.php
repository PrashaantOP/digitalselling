<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AutodmRule extends Model
{
    use HasFactory;

    protected $table = 'autodm_rules';


    protected $fillable = [
        'user_id',
        'instagram_post_id',
        'trigger_keyword',
        'dm_message',
        'linked_product_id',
        'is_active',
    ];


    protected $casts = [
        'is_active' => 'boolean',
    ];


    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function linkedProduct()
    {
        return $this->belongsTo(Product::class, 'linked_product_id');
    }

    public function logs()
    {
        return $this->hasMany(AutodmLog::class, 'rule_id');
    }
}
