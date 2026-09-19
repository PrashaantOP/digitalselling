<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lesson_text_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_text_content_id')->constrained('lesson_text_contents')->cascadeOnDelete();
            $table->string('image_path');
            $table->smallInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_text_images');
    }
};
