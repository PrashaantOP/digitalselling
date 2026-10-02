<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quiz_attempts', function (Blueprint $table) {
            // student ne "Reset quiz" dabaya — attempt history me rehta hai, bas player me dobara nahi dikhta
            $table->dateTime('cleared_at')->nullable()->after('attempted_at');
            $table->index(['quiz_id', 'enrollment_id', 'cleared_at']);
        });
    }

    public function down(): void
    {
        Schema::table('quiz_attempts', function (Blueprint $table) {
            $table->dropIndex(['quiz_id', 'enrollment_id', 'cleared_at']);
            $table->dropColumn('cleared_at');
        });
    }
};
