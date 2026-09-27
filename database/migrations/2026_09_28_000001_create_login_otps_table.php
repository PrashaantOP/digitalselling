<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Login ka doosra step (email OTP) — admin har login pe, creator jab 2FA on kare. Code hash hi store hota hai. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('login_otps', function (Blueprint $table) {
            $table->id();
            $table->morphs('authenticatable');
            $table->string('purpose', 30); // admin_login | creator_login | creator_2fa_setup
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamps();

            $table->index(['authenticatable_type', 'authenticatable_id', 'purpose', 'created_at'], 'login_otps_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_otps');
    }
};
