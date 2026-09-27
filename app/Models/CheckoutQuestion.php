<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CheckoutQuestion extends Model
{
    use HasFactory, HasUuid;

    protected $table = 'checkout_questions';


    protected $fillable = [
        'product_id',
        'label',
        'field_type',
        'options',
        'is_required',
        'is_enabled',
        'sort_order',
    ];


    protected $casts = [
        'options' => 'array',
        'is_required' => 'boolean',
        'is_enabled' => 'boolean',
    ];


    /**
     * Seeded State dropdown — label/type/options fixed hain (states ki list),
     * creator sirf Show aur Required badal sakta hai.
     */
    public function isState(): bool
    {
        return $this->field_type === 'dropdown' && $this->label === 'State';
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function answers()
    {
        return $this->hasMany(OrderCheckoutAnswer::class, 'checkout_question_id');
    }
}
