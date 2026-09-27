<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Platform admins ab `admins` table + `admin` guard me hain (creators se poori tarah alag).
 * users.role me super_admin rehna privilege-escalation ka rasta tha — hata diya.
 */
return new class extends Migration
{
    public function up(): void
    {
        $count = DB::table('users')->where('role', 'super_admin')->count();

        if ($count > 0) {
            throw new RuntimeException("{$count} user(s) still have role=super_admin. Move them to the admins table (php artisan admin:create) and change their role before migrating.");
        }

        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['creator', 'sub_admin', 'customer'])->default('creator')->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['creator', 'sub_admin', 'customer', 'super_admin'])->default('creator')->change();
        });
    }
};
