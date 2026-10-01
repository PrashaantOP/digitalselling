<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Buyer = kharidne wala insaan (customer portal /me ka login). `customers` table per-creator CRM hai;
 * ye table us insaan ki ek hi pehchaan hai jisse uske saare creators ke customer rows jude hote hain.
 * Email aur phone dono unique. Login: email OTP hamesha, mobile SMS OTP sirf verified phone pe.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('buyers', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('email', 150)->unique(); // hamesha lowercase
            $table->string('name', 150)->nullable();
            $table->string('phone', 20)->nullable()->unique(); // normalized: +919876543210
            $table->timestamp('email_verified_at')->nullable();
            // null = mobile se login band. Checkout pe likha phone verified nahi hota.
            $table->timestamp('phone_verified_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('buyers');
    }
};
