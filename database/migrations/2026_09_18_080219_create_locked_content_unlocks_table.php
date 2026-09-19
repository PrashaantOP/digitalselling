<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('locked_content_unlocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('locked_content_id')->constrained('locked_content_details')->restrictOnDelete();
            $table->foreignId('order_id')->constrained('orders')->restrictOnDelete();
            $table->timestamp('unlocked_at')->useCurrent();

            $table->unique(['locked_content_id', 'order_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('locked_content_unlocks');
    }
};
