<?php

/*
| Creator ki Pro plan billing (prepaid). Price `subscription_plans.monthly_price` se aata hai aur
| GST-INCLUSIVE hai — creator ₹499 hi deta hai, invoice me tax andar se nikalta hai.
*/
return [

    // kitne mahine ek saath kharide ja sakte hain
    'durations' => [1, 3, 6, 12],

    // mahine => discount % (lambi kharid pe chhoot deni ho to yahan). Abhi koi chhoot nahi.
    'discounts' => [],

    'gst_rate' => (float) env('BILLING_GST_RATE', 18),

    // SAC code CA se confirm karke .env me daalo — khaali ho to invoice pe line nahi aati
    'sac_code' => env('BILLING_SAC_CODE'),

    // pending kharid itne minute baad apne aap fail (billing:expire-pending)
    'pending_ttl_minutes' => 30,

    // expiry se kitne din pehle reminder mail jaaye (0 = expiry ke din)
    'reminder_days' => [7, 3, 1, 0],

    // invoice pe platform (seller) ki details
    'seller' => [
        'name' => env('BILLING_SELLER_NAME', env('APP_NAME', 'DigitalSelling')),
        'legal_name' => env('BILLING_SELLER_LEGAL_NAME'),
        'gstin' => env('BILLING_SELLER_GSTIN'),
        'address' => env('BILLING_SELLER_ADDRESS'),
        'state' => env('BILLING_SELLER_STATE'), // jaise "Bihar" — GSTIN ho to state usi se nikalta hai
        'email' => env('BILLING_SELLER_EMAIL', env('MAIL_FROM_ADDRESS')),
    ],
];
