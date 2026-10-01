<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Settlement ke bahar ka len-den — settle ho chuke order ka refund wapas lena, ya admin ka manual debit/credit.
 * `settlement_id` NULL = abhi laga nahi; agli cycle (SettlementService) ise creator ke settlement me jod deti hai.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settlement_adjustments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('creator_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->foreignId('settlement_id')->nullable()->constrained('settlements')->nullOnDelete();
            $table->enum('type', ['refund_reversal', 'manual_debit', 'manual_credit']);
            $table->decimal('amount', 12, 2); // signed — debit negative, credit positive
            $table->string('reason');
            $table->foreignId('admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamps();

            $table->index(['creator_id', 'settlement_id']);
        });

        Schema::table('settlements', function (Blueprint $table) {
            // snapshot: is settlement me adjustments ka kul asar. net_amount = orders ka net + ye.
            $table->decimal('adjustment_amount', 12, 2)->default(0)->after('commission_amount');
        });
    }

    public function down(): void
    {
        Schema::table('settlements', function (Blueprint $table) {
            $table->dropColumn('adjustment_amount');
        });

        Schema::dropIfExists('settlement_adjustments');
    }
};
