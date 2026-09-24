<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('checkout_questions')
            ->where('field_type', 'dropdown')
            ->where('label', 'State')
            ->update(['is_required' => false, 'is_enabled' => true, 'updated_at' => now()]);

        DB::table('checkout_questions')->whereNull('is_enabled')->update(['is_enabled' => true]);
    }

    public function down(): void
    {
        // Keep creator customisations intact on rollback.
    }
};
