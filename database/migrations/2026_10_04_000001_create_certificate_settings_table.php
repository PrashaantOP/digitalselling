<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Creator ka certificate design — ek creator ki ek row, uske saare courses pe lagta hai.
 * Row na ho (ya koi field khaali ho) to store ka avatar / brand colour / creator ka naam default banta hai.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificate_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->enum('template', ['classic', 'modern', 'minimal'])->default('classic');
            $table->string('logo_path')->nullable();       // null => stores.avatar
            $table->string('signature_path')->nullable();
            $table->string('signatory_name', 100)->nullable();  // null => creator ka naam
            $table->string('signatory_title', 100)->nullable(); // null => "Instructor"
            $table->string('accent_color', 10)->nullable();     // null => store_appearances.brand_color
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certificate_settings');
    }
};
