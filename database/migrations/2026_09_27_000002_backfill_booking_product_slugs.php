<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Pehle 'booking' products ka slug NULL rehta tha. Ab public booking page (/book/{username}?service={slug})
 * session ko slug se hi pehchanta hai — purane sessions ko bhi slug do, warna wo book nahi ho sakte.
 * Slug usi tarah banta hai jaise BaseProductController::uniqueSlug().
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('products')->where('type', 'booking')->whereNull('slug')->orderBy('id')->get(['id', 'title'])
            ->each(function (object $product): void {
                $base = Str::slug(Str::limit((string) $product->title, 60, '')) ?: 'session';
                $slug = $base;

                while (DB::table('products')->where('slug', $slug)->exists()) {
                    $slug = $base . '-' . Str::lower(Str::random(4));
                }

                DB::table('products')->where('id', $product->id)->update(['slug' => $slug]);
            });
    }

    public function down(): void
    {
        // slugs rehne do — NULL wapas karne se live booking links toot jayenge
    }
};
