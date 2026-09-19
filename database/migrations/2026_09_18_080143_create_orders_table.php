<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 30)->unique();
            $table->foreignId('creator_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->restrictOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->string('buyer_name', 150)->nullable();
            $table->string('buyer_email', 150)->nullable();
            $table->string('buyer_phone', 20);
            $table->string('buyer_gstin', 20)->nullable();
            $table->string('buyer_state', 50)->nullable();
            $table->foreignId('coupon_id')->nullable()->constrained('coupons')->nullOnDelete();
            $table->decimal('base_amount', 10, 2);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('addon_amount', 10, 2)->default(0);
            $table->decimal('total_amount', 10, 2);
            $table->decimal('commission_rate', 5, 2);
            $table->decimal('platform_fee', 10, 2);
            $table->decimal('net_payout_amount', 10, 2);
            $table->string('payment_gateway', 30)->default('razorpay');
            $table->string('gateway_order_id', 100)->nullable();
            $table->string('gateway_payment_id', 100)->nullable();
            $table->enum('status', ['pending', 'success', 'failed', 'refunded'])->default('pending');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['creator_id', 'status']);
            $table->index(['product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
