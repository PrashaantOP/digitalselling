<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Template pehle 3 naamo ka enum tha — naye designs judte rahenge, isliye string (list CertificateSetting::TEMPLATES me). */
    public function up(): void
    {
        Schema::table('certificate_settings', function (Blueprint $table) {
            $table->string('template', 40)->default('classic')->change();
        });
    }

    public function down(): void
    {
        // enum pe wapas nahi — naye template wali rows toot jaayengi
    }
};
