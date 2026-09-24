<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course_details', function (Blueprint $table) {
            $table->json('optional_sections')->nullable()->after('total_lessons');
        });
    }

    public function down(): void
    {
        Schema::table('course_details', function (Blueprint $table) {
            $table->dropColumn('optional_sections');
        });
    }
};
