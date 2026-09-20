<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * FIX: public checkout routes (/c/{slug}, /e/{slug}, /b/{slug}, /l/{slug}, /p/{slug}) me
     * creator/username koi part nahi hai URL ka — isliye slug creator-wise unique nahi,
     * **globally unique** hona chahiye (BaseProductController@commonRules me already
     * `Rule::unique('products', 'slug')` globally check ho raha hai — DB constraint bhi
     * usi ke saath match karna chahiye, warna race-condition me 2 creators same slug le
     * sakte hain aur ek dusre ka checkout page hijack ho sakta hai).
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['creator_id', 'slug']);
            $table->unique('slug'); // 'booking' type ke NULL slugs allowed rahenge (MySQL multiple NULLs allow karta hai)
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->unique(['creator_id', 'slug']);
        });
    }
};
