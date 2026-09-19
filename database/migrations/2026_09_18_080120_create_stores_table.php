<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('display_name', 150);
            $table->text('bio')->nullable();
            $table->string('avatar')->nullable();
            $table->string('welcome_message')->nullable();
            $table->string('header_heading', 150)->nullable();
            $table->boolean('is_live')->default(false);
            $table->enum('column_layout', ['single', 'double'])->default('single');
            $table->boolean('sensitive_content_warning')->default(false);
            $table->string('meta_title', 150)->nullable();
            $table->string('meta_description', 255)->nullable();
            $table->string('fb_pixel_id', 50)->nullable();
            $table->string('ga_tracking_id', 50)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stores');
    }
};
