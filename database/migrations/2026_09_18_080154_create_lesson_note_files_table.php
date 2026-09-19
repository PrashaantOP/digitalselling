<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lesson_note_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_note_id')->constrained('lesson_notes')->cascadeOnDelete();
            $table->string('file_path');
            $table->string('original_name')->nullable();
            $table->smallInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_note_files');
    }
};
