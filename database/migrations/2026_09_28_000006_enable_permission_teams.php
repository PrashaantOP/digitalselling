<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Roles har creator (tenant) ke apne hone chahiye — RoleController / SubAdminController / bindings sab
 * `team_id` se filter karte hain, par Spatie "teams" band tha aur column tha hi nahi (roles/sub-admin pages
 * SQL error). Bina teams ke roles saare creators me share ho jaate — ek creator dusre ka role badal deta.
 * Ye migration tables ko Spatie ke teams structure pe laati hai (config/permission.php 'teams' => true).
 * Har table alag se check hoti hai — fresh DB pe (create migration ne pehle hi bana diya) kuch nahi karti.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('roles', 'team_id')) {
            Schema::table('roles', function (Blueprint $table) {
                $table->unsignedBigInteger('team_id')->nullable()->after('id');
                $table->index('team_id', 'roles_team_foreign_key_index');
                $table->dropUnique('roles_name_guard_name_unique');
                $table->unique(['team_id', 'name', 'guard_name']);
            });
        }

        // Pivot tables: primary key foreign key ka index bhi hai, isliye alter nahi ho sakta — khaali hon to
        // Spatie ke teams layout ke saath dobara banao (abhi tak koi role assign hua hi nahi).
        foreach (['model_has_permissions' => ['permission_id', 'permissions'], 'model_has_roles' => ['role_id', 'roles']] as $table => [$pivot, $parent]) {
            if (Schema::hasColumn($table, 'team_id')) {
                continue;
            }

            if (DB::table($table)->exists()) {
                throw new RuntimeException("{$table} has rows — migrate them to team-scoped roles manually before enabling teams.");
            }

            Schema::drop($table);
            Schema::create($table, function (Blueprint $t) use ($table, $pivot, $parent) {
                $t->unsignedBigInteger($pivot);
                $t->string('model_type');
                $t->unsignedBigInteger('model_id');
                $t->index(['model_id', 'model_type'], "{$table}_model_id_model_type_index");
                $t->foreign($pivot)->references('id')->on($parent)->onDelete('cascade');
                $t->unsignedBigInteger('team_id');
                $t->index('team_id', "{$table}_team_foreign_key_index");
                $t->primary(['team_id', $pivot, 'model_id', 'model_type'], $table === 'model_has_roles' ? 'model_has_roles_role_model_type_primary' : 'model_has_permissions_permission_model_type_primary');
            });
        }

        app('cache')->forget(config('permission.cache.key'));
    }

    public function down(): void
    {
        // tenant-scoped roles se wapas global pe jaana data mix kar dega — jaan-bujh ke no-op
    }
};
