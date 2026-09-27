<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Sub-admin invites:
 * - token ab sirf sha256 hash me (DB leak ho to bhi invite link nahi banta), 7 din expiry, ek hi baar.
 * - role_name column controller use karta tha par table me tha hi nahi (invite = SQL error).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sub_admins', function (Blueprint $table) {
            if (! Schema::hasColumn('sub_admins', 'role_name')) {
                $table->string('role_name', 125)->nullable()->after('status');
            }
            $table->char('invite_token_hash', 64)->nullable()->after('invite_token');
            $table->timestamp('invite_expires_at')->nullable()->after('invited_at');
            $table->index('invite_token_hash');
        });

        // pehle bheje gaye links chalte rahein — plain token ka hash bana do
        DB::table('sub_admins')->whereNotNull('invite_token')->orderBy('id')->each(function ($row) {
            DB::table('sub_admins')->where('id', $row->id)->update([
                'invite_token_hash' => hash('sha256', $row->invite_token),
                'invite_expires_at' => now()->addDays(7),
            ]);
        });

        Schema::table('sub_admins', fn (Blueprint $table) => $table->dropColumn('invite_token'));
    }

    public function down(): void
    {
        Schema::table('sub_admins', function (Blueprint $table) {
            $table->string('invite_token', 100)->nullable()->after('status');
            $table->dropIndex(['invite_token_hash']);
            $table->dropColumn(['invite_token_hash', 'invite_expires_at', 'role_name']);
        });
    }
};
