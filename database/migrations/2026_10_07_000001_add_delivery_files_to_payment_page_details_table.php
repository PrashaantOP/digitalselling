<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Payment page ke "Files to deliver" — [{label, url}], pay ke baad buyer ko email + portal me milte hain. */
    public function up(): void
    {
        Schema::table('payment_page_details', function (Blueprint $table) {
            $table->json('delivery_files')->nullable()->after('whats_included');
        });
    }

    public function down(): void
    {
        Schema::table('payment_page_details', function (Blueprint $table) {
            $table->dropColumn('delivery_files');
        });
    }
};
