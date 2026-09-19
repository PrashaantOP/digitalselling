<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_testimonials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('course_details')->cascadeOnDelete();
            $table->boolean('is_enabled')->default(true);
            $table->string('name', 150);
            $table->text('message');
            $table->string('avatar_path')->nullable();
            $table->smallInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_testimonials');
    }
};
