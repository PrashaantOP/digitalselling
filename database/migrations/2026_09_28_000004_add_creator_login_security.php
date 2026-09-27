<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Creator login security:
 * - user_devices: kis browser se pehle login ho chuka hai — naye device pe creator ko email jaata hai.
 * - users.two_factor_enabled: creator chahe to login pe email OTP (Settings → Security).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->char('device_hash', 64); // sha256(device cookie) — asli token kabhi DB me nahi
            $table->string('user_agent', 255)->nullable();
            $table->string('last_ip', 45)->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'device_hash']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('two_factor_enabled')->default(false)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('two_factor_enabled'));
        Schema::dropIfExists('user_devices');
    }
};
