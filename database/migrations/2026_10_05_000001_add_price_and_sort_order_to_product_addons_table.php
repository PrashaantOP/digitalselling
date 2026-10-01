<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add-on ka offer price: creator ₹799 ki book ko course ke saath ₹499 me de sake.
 * NULL = add-on product ka apna (discount laga) price. sort_order = checkout pe kram (jodne ke kram me).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_addons', function (Blueprint $table) {
            $table->decimal('price', 10, 2)->nullable()->after('addon_product_id');
            $table->smallInteger('sort_order')->default(0)->after('price');
        });
    }

    public function down(): void
    {
        Schema::table('product_addons', function (Blueprint $table) {
            $table->dropColumn(['price', 'sort_order']);
        });
    }
};
