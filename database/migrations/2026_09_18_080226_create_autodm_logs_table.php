<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('autodm_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rule_id')->constrained('autodm_rules')->cascadeOnDelete();
            $table->string('instagram_username', 100);
            $table->text('comment_text')->nullable();
            $table->boolean('dm_sent')->default(false);
            $table->timestamp('triggered_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('autodm_logs');
    }
};
