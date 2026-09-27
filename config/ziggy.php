<?php

return [
    // Ziggy har page pe route list frontend ko bhejta hai — admin panel ke routes creators/public ko na dikhein.
    // Admin pages plain URLs (/admin/...) use karte hain.
    'except' => ['admin.*'],
];
