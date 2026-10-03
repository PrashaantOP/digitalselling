<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Creator ke email notifications. Row na ho to defaults (migration wale) lagte hain.
 * `new_messages` column purana hai — app me messaging nahi hai, isliye screen pe nahi dikhta.
 */
class NotificationPreference extends Model
{
    use HasFactory;

    protected $table = 'notification_preferences';

    /** Screen pe dikhne wale switch aur unke defaults (row na ho to yahi maana jaata hai). */
    public const DEFAULTS = [
        'payment_received' => true,
        'course_enrollment' => true,
        'course_completion' => true,
        'weekly_digest' => false,
    ];

    protected $fillable = [
        'user_id',
        'course_enrollment',
        'course_completion',
        'new_messages',
        'payment_received',
        'weekly_digest',
    ];

    protected $casts = [
        'course_enrollment' => 'boolean',
        'course_completion' => 'boolean',
        'new_messages' => 'boolean',
        'payment_received' => 'boolean',
        'weekly_digest' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** Creator ye email chahta hai ya nahi. */
    public static function wants(?User $creator, string $key): bool
    {
        if (! $creator) {
            return false;
        }

        $value = $creator->notificationPreference?->{$key};

        return $value === null ? (self::DEFAULTS[$key] ?? true) : (bool) $value;
    }
}
