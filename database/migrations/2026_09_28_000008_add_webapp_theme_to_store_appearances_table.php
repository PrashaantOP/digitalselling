<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Webapp (/w/{username}) ka apna theme — storefront ke `theme` se alag.
 * Premium theme chuna hua ho aur Pro khatam ho jaye to WebappThemes::resolve() render pe hi
 * free theme pe gira deta hai; value DB me bachi rehti hai taaki Pro lautne pe wapas mil jaye.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('store_appearances', function (Blueprint $table) {
            // default = free theme (purana webapp design), taaki naye stores ka page waisa hi rahe
            $table->string('webapp_theme', 30)->default('studio')->after('theme');
        });
    }

    public function down(): void
    {
        Schema::table('store_appearances', function (Blueprint $table) {
            $table->dropColumn('webapp_theme');
        });
    }
};
