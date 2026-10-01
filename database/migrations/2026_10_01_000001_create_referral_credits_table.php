<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Referral credit ka ledger (append-only). Balance kabhi column me store nahi hota —
 * hamesha yahin se compute hota hai (settlements wali hi soch), taaki hisaab kabhi na bigde.
 *
 * Ye paisa bank me withdraw nahi hota — sirf Pro subscription me redeem hota hai.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('referral_credits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete(); // referrer
            $table->foreignId('referral_id')->nullable()->constrained('referrals')->nullOnDelete();
            $table->enum('type', ['earned', 'redeemed']);
            $table->decimal('amount', 10, 2); // hamesha positive — direction `type` se aata hai
            $table->string('description');
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'type']);
            // ek referral se ₹200 sirf EK baar — double-credit DB level pe hi ruk jaata hai
            $table->unique(['referral_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referral_credits');
    }
};
