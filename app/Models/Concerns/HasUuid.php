<?php

namespace App\Models\Concerns;

use Illuminate\Support\Str;

/**
 * URL me kabhi numeric id nahi jaati — jo bhi model route me pass hota hai uska `uuid` jaata hai
 * (guess-proof, record count leak nahi hota). Bindings routes/bindings.php me uuid se dhoondhti hain.
 */
trait HasUuid
{
    public static function bootHasUuid(): void
    {
        static::creating(function ($model): void {
            $model->uuid ??= (string) Str::uuid();
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /** Duplicate (course/product copy) pe naya uuid banna chahiye — purana copy hua to unique toot jaata. */
    public function replicate(?array $except = null)
    {
        return parent::replicate(array_values(array_unique(array_merge($except ?? [], ['uuid']))));
    }
}
