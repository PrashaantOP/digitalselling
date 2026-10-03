<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Creator dashboard se aaye bug reports / feature requests — platform admin padhta aur status badalta hai. */
    public function up(): void
    {
        Schema::create('feedback_reports', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            // jisne bheja (creator ya team member) aur kis store ka hai
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('creator_id')->constrained('users')->cascadeOnDelete();
            $table->enum('type', ['bug', 'feature']);
            $table->string('title', 150);
            $table->text('details');
            $table->string('page_url', 500)->nullable();
            $table->string('screenshot_path')->nullable();
            $table->enum('status', ['open', 'in_progress', 'resolved', 'closed'])->default('open');
            $table->text('admin_note')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['creator_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feedback_reports');
    }
};
