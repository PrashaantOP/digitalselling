<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/** Admin panel ke URLs (creator, KYC, payout method) bhi uuid pe — numeric id kabhi URL me nahi. */
return new class extends Migration
{
    private const TABLES = ['users', 'kyc_verifications', 'payout_methods'];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            if (! Schema::hasColumn($table, 'uuid')) {
                Schema::table($table, fn (Blueprint $t) => $t->uuid('uuid')->nullable()->after('id'));
            }

            DB::table($table)->whereNull('uuid')->orderBy('id')->chunkById(500, function ($rows) use ($table) {
                foreach ($rows as $row) {
                    DB::table($table)->where('id', $row->id)->update(['uuid' => (string) Str::uuid()]);
                }
            });

            Schema::table($table, function (Blueprint $t) {
                $t->uuid('uuid')->nullable(false)->change();
                $t->unique('uuid');
            });
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $t) use ($table) {
                $t->dropUnique("{$table}_uuid_unique");
                $t->dropColumn('uuid');
            });
        }
    }
};
