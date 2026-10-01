<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Referral pe ₹200 kab mila — isi se pata chalta hai ki reward ho chuka hai ya nahi. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('referrals', function (Blueprint $table) {
            $table->timestamp('rewarded_at')->nullable()->after('total_earnings');
        });
    }

    public function down(): void
    {
        Schema::table('referrals', function (Blueprint $table) {
            $table->dropColumn('rewarded_at');
        });
    }
};
