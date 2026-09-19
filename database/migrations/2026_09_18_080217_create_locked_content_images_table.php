<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('locked_content_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('locked_content_id')->constrained('locked_content_details')->cascadeOnDelete();
            $table->string('image_path');
            $table->smallInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('locked_content_images');
    }
};
