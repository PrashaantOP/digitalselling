<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('creator_id')->constrained('users')->cascadeOnDelete();
            $table->enum('type', ['course', 'event', 'book', 'locked_content', 'payment_page', 'booking']);
            $table->string('title', 150);
            $table->string('slug', 150)->nullable();
            $table->enum('status', ['draft', 'unpublished', 'published'])->default('draft');
            $table->enum('cover_type', ['image', 'video'])->nullable();
            $table->string('cover_video_url')->nullable();
            $table->text('description')->nullable();
            $table->enum('pricing_type', ['fixed', 'customer_decides', 'free'])->default('fixed');
            $table->decimal('price', 10, 2)->default(0);
            $table->boolean('has_discount')->default(false);
            $table->decimal('discounted_price', 10, 2)->nullable();
            $table->string('button_text', 30)->default('Buy now');
            $table->string('theme', 30)->nullable();
            $table->string('accent_color', 10)->nullable();
            $table->string('post_purchase_message')->nullable();
            $table->text('terms_and_conditions')->nullable();
            $table->text('refund_policy')->nullable();
            $table->text('privacy_policy')->nullable();
            $table->string('fb_pixel_id', 50)->nullable();
            $table->string('ga_tracking_id', 50)->nullable();
            $table->integer('sales_count')->default(0);
            $table->decimal('revenue_total', 12, 2)->default(0);
            $table->integer('views_count')->default(0);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['creator_id', 'slug']);
            $table->index(['creator_id', 'type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
