<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('checkout_questions', function (Blueprint $table) {
            $table->boolean('is_enabled')->default(true)->after('is_required');
        });
    }

    public function down(): void
    {
        Schema::table('checkout_questions', function (Blueprint $table) {
            $table->dropColumn('is_enabled');
        });
    }
};
