<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 20)->nullable()->unique()->after('email');
            $table->string('country_code', 5)->default('+91')->after('phone');
            $table->string('username', 50)->nullable()->unique()->after('country_code');
            $table->string('avatar')->nullable()->after('username');
            $table->enum('role', ['creator', 'sub_admin', 'customer', 'super_admin'])->default('creator')->after('avatar');
            $table->foreignId('parent_creator_id')->nullable()->after('role')->constrained('users')->nullOnDelete();
            $table->enum('plan', ['free', 'pro'])->default('free')->after('parent_creator_id');
            $table->timestamp('phone_verified_at')->nullable()->after('email_verified_at');
            $table->enum('status', ['active', 'suspended'])->default('active')->after('plan');
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parent_creator_id');
            $table->dropColumn([
                'phone', 'country_code', 'username', 'avatar', 'role',
                'plan', 'phone_verified_at', 'status', 'deleted_at',
            ]);
        });
    }
};
