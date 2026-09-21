<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->uuid('uuid')->nullable()->unique()->after('id');
        });

        DB::table('products')->whereNull('uuid')->orderBy('id')->chunkById(200, function ($products) {
            foreach ($products as $product) {
                DB::table('products')->where('id', $product->id)->update(['uuid' => (string) Str::uuid()]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['uuid']);
            $table->dropColumn('uuid');
        });
    }
};
