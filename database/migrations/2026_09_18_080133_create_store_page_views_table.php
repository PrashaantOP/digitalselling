<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_page_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('visitor_id')->nullable()->constrained('visitors')->nullOnDelete();
            $table->string('page_path');
            $table->string('referrer')->nullable();
            $table->timestamp('viewed_at')->useCurrent();

            $table->index(['store_id', 'viewed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_page_views');
    }
};
