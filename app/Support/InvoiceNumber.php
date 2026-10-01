<?php

namespace App\Support;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Pro plan ke tax invoice ka number: INV-2627-000001 (financial year April–March ke andar sequential).
 * Counter row lock ho ke badhta hai — do payments ek saath aayein tab bhi number na dohraye, na chhoote.
 * Hamesha DB transaction ke andar call karo (invoice na bane to number bhi wapas ho jaye).
 */
class InvoiceNumber
{
    public static function financialYear(?Carbon $date = null): string
    {
        $date = ($date ?? now())->copy()->setTimezone('Asia/Kolkata');
        $start = $date->month >= 4 ? $date->year : $date->year - 1;

        return substr((string) $start, -2) . substr((string) ($start + 1), -2);
    }

    public static function next(): string
    {
        $fy = self::financialYear();

        DB::table('invoice_sequences')->insertOrIgnore(['fy' => $fy, 'last_number' => 0]);

        $next = (int) DB::table('invoice_sequences')->where('fy', $fy)->lockForUpdate()->value('last_number') + 1;
        DB::table('invoice_sequences')->where('fy', $fy)->update(['last_number' => $next]);

        return sprintf('INV-%s-%06d', $fy, $next);
    }
}
