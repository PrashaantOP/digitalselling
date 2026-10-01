<?php

namespace App\Support;

/**
 * GST state codes (GSTIN ke pehle 2 digit). Seller aur buyer ka code same ho to CGST + SGST, warna IGST.
 * Naam wahi hain jo BaseProductController::INDIAN_STATES me hain.
 */
class GstStates
{
    public const CODES = [
        '01' => 'Jammu and Kashmir', '02' => 'Himachal Pradesh', '03' => 'Punjab', '04' => 'Chandigarh',
        '05' => 'Uttarakhand', '06' => 'Haryana', '07' => 'Delhi', '08' => 'Rajasthan', '09' => 'Uttar Pradesh',
        '10' => 'Bihar', '11' => 'Sikkim', '12' => 'Arunachal Pradesh', '13' => 'Nagaland', '14' => 'Manipur',
        '15' => 'Mizoram', '16' => 'Tripura', '17' => 'Meghalaya', '18' => 'Assam', '19' => 'West Bengal',
        '20' => 'Jharkhand', '21' => 'Odisha', '22' => 'Chhattisgarh', '23' => 'Madhya Pradesh', '24' => 'Gujarat',
        '26' => 'Dadra and Nagar Haveli and Daman and Diu', '27' => 'Maharashtra', '29' => 'Karnataka', '30' => 'Goa',
        '31' => 'Lakshadweep', '32' => 'Kerala', '33' => 'Tamil Nadu', '34' => 'Puducherry',
        '35' => 'Andaman and Nicobar Islands', '36' => 'Telangana', '37' => 'Andhra Pradesh', '38' => 'Ladakh',
    ];

    /** @return string[] */
    public static function names(): array
    {
        $names = array_values(self::CODES);
        sort($names);

        return $names;
    }

    /** GSTIN ho to usi se (zyada bharosemand), warna state ke naam se. Pata na chale to null. */
    public static function code(?string $gstin, ?string $stateName = null): ?string
    {
        $prefix = substr(trim((string) $gstin), 0, 2);

        if (isset(self::CODES[$prefix])) {
            return $prefix;
        }

        $code = array_search(trim((string) $stateName), self::CODES, true);

        return $code === false ? null : (string) $code;
    }

    public static function name(?string $code): ?string
    {
        return self::CODES[$code] ?? null;
    }
}
