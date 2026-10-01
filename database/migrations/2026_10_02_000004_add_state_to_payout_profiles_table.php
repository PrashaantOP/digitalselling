<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Creator ka state — Pro ke invoice pe CGST+SGST lagega ya IGST, isi se tay hota hai (GSTIN na ho tab). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payout_profiles', function (Blueprint $table) {
            $table->string('state', 50)->nullable()->after('profession');
        });
    }

    public function down(): void
    {
        Schema::table('payout_profiles', function (Blueprint $table) {
            $table->dropColumn('state');
        });
    }
};
