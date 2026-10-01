<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Buyers ab `buyers` table + `customer` guard me hain — `users` me kabhi nahi aate.
 * users.role me `customer` rehne se koi buyer galti se dashboard user ban sakta tha; hata diya.
 */
return new class extends Migration
{
    public function up(): void
    {
        $count = DB::table('users')->where('role', 'customer')->count();

        if ($count > 0) {
            throw new RuntimeException("{$count} user(s) still have role=customer. Change or remove them before migrating — buyers live in the buyers table now.");
        }

        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['creator', 'sub_admin'])->default('creator')->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['creator', 'sub_admin', 'customer'])->default('creator')->change();
        });
    }
};
