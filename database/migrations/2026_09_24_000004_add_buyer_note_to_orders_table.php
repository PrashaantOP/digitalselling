<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Payment pages buyer se ek optional short note/reference le sakte hain (checkout pe naya field). */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('buyer_note', 500)->nullable()->after('buyer_state');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('buyer_note');
        });
    }
};
