<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_appearances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->unique()->constrained('stores')->cascadeOnDelete();
            $table->enum('theme', ['classic', 'ocean', 'sunset', 'forest', 'mono', 'paper'])->default('classic');
            $table->string('brand_color', 10)->default('#2E6EF7');
            $table->string('font_family', 50)->default('Inter');
            $table->string('custom_background_path')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_appearances');
    }
};
