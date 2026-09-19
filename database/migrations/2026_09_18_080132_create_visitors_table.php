<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visitors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('session_token', 100);
            $table->string('phone', 20)->nullable();
            $table->string('name', 150)->nullable();
            $table->boolean('is_customer')->default(false);
            $table->integer('visits_count')->default(1);
            $table->integer('pages_count')->default(1);
            $table->string('country', 100)->nullable();
            $table->string('city', 100)->nullable();
            $table->string('device', 30)->nullable();
            $table->string('browser', 30)->nullable();
            $table->timestamp('first_seen_at')->useCurrent();
            $table->timestamp('last_seen_at')->useCurrent()->useCurrentOnUpdate();

            $table->index(['store_id', 'session_token']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visitors');
    }
};
