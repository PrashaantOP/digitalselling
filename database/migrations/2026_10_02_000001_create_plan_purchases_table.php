<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pro plan ki prepaid kharid — har payment attempt ki ek row. Auto-debit nahi:
 * creator 1/3/6/12 mahine ek baar pay karta hai aur users.plan_expires_at aage badhta hai.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_purchases', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained('subscription_plans')->restrictOnDelete();
            $table->unsignedTinyInteger('months');
            // snapshot — plan ka price baad me badle to purani kharid ka hisaab na bigde
            $table->decimal('unit_price', 10, 2);
            $table->decimal('subtotal', 10, 2);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('credit_applied', 10, 2)->default(0); // referral credit
            $table->decimal('amount_payable', 10, 2); // gateway pe jo katega (GST inclusive)
            $table->enum('status', ['pending', 'paid', 'failed', 'refunded'])->default('pending');
            $table->string('gateway', 30)->default('razorpay'); // 'credit' = poora referral credit se
            // unique — ek hi payment do baar fulfil na ho (verify + webhook saath aayein tab bhi)
            $table->string('gateway_order_id', 100)->nullable()->unique();
            $table->string('gateway_payment_id', 100)->nullable()->unique();
            $table->timestamp('period_start')->nullable();
            $table->timestamp('period_end')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->string('failure_reason')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_purchases');
    }
};
