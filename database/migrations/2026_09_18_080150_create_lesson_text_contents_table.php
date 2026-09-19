<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lesson_text_contents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')->unique()->constrained('course_lessons')->cascadeOnDelete();
            $table->longText('content');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_text_contents');
    }
};
