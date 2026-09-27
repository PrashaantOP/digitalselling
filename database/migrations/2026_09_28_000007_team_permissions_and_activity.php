<?php

use App\Support\TeamPermissions;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Team (sub-admin) feature:
 * - permissions table ab tak khaali tha — roles me kuch daal hi nahi sakte the. Catalog (TeamPermissions) seed.
 * - roles.is_template: ready-made roles pehchanne ke liye.
 * - team_activity_logs: kisne kisko invite / remove / role change kiya — owner dekh sake.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (TeamPermissions::all() as $name) {
            if (! DB::table('permissions')->where('name', $name)->where('guard_name', 'web')->exists()) {
                DB::table('permissions')->insert(['name' => $name, 'guard_name' => 'web', 'created_at' => now(), 'updated_at' => now()]);
            }
        }

        if (! Schema::hasColumn('roles', 'is_template')) {
            Schema::table('roles', fn (Blueprint $t) => $t->boolean('is_template')->default(false)->after('guard_name'));
        }

        Schema::create('team_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('creator_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 60);
            $table->string('subject', 150)->nullable(); // email / role naam — readable, id nahi
            $table->json('meta')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['creator_id', 'created_at']);
        });

        app('cache')->forget(config('permission.cache.key'));
    }

    public function down(): void
    {
        Schema::dropIfExists('team_activity_logs');
        if (Schema::hasColumn('roles', 'is_template')) {
            Schema::table('roles', fn (Blueprint $t) => $t->dropColumn('is_template'));
        }
    }
};
