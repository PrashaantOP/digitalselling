<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payout_methods', function (Blueprint $table) {
            // null = abhi verify nahi hua; details badalte hi wapas null ho jaata hai
            $table->timestamp('verified_at')->nullable()->after('ifsc');
            // default true tha — bina value ke insert pe ek user ke do default ban jaate
            $table->boolean('is_default')->default(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('payout_methods', function (Blueprint $table) {
            $table->dropColumn('verified_at');
            $table->boolean('is_default')->default(true)->change();
        });
    }
};
