<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Settlement = ek batch payout. Creator request nahi karta — cycle (settlements:run) roz
 * eligible orders ko group karke ek row banata hai. Amounts yahan freeze ho jaate hain,
 * aur "kaunsi bookings thi" ka jawab orders.settlement_id se milta hai.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settlements', function (Blueprint $table) {
            $table->id();
            // display + route key (STL-20260927-0001) — URL me id expose nahi hoti
            $table->string('number', 30)->unique();
            $table->foreignId('creator_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('payout_method_id')->constrained('payout_methods')->restrictOnDelete();
            $table->unsignedInteger('orders_count')->default(0);
            // snapshot: orders ke SUM se bharte hain taaki baad me koi bhi badlav history na bigaade
            $table->decimal('gross_amount', 12, 2);
            $table->decimal('commission_amount', 12, 2);
            $table->decimal('net_amount', 12, 2);
            $table->timestamp('period_start')->nullable();
            $table->timestamp('period_end')->nullable();
            $table->enum('status', ['pending', 'processing', 'paid', 'failed'])->default('pending');
            $table->string('reference_number', 100)->nullable(); // bank UTR — paid pe bharta hai
            $table->string('failure_reason')->nullable();
            $table->string('notes')->nullable();
            $table->timestamp('processed_at')->nullable(); // paid/failed hone ka waqt
            $table->timestamps();

            $table->index(['creator_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settlements');
    }
};
