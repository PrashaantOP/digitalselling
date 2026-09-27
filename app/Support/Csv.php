<?php

namespace App\Support;

/**
 * CSV formula injection se bachav. Buyer ka naam/email public checkout se aata hai — `=HYPERLINK(...)`
 * jaisa value Excel/Sheets me formula ban ke chal jaata. Aise cell ke aage `'` laga ke plain text banao.
 */
class Csv
{
    public static function safe(mixed $value): mixed
    {
        if (! is_string($value) || $value === '') {
            return $value;
        }

        return in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true) ? "'" . $value : $value;
    }

    /** @param array<int, mixed> $row */
    public static function row(array $row): array
    {
        return array_map([self::class, 'safe'], $row);
    }
}
