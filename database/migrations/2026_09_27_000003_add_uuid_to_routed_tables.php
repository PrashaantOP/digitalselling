<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Route / URL me kabhi numeric id nahi jaati — har woh table jiska record URL me pass hota hai
 * uska `uuid` hota hai (models me HasUuid trait, bindings routes/bindings.php me).
 * Products ke paas uuid pehle se tha (nullable) — yahan bache hue NULL bhar ke NOT NULL kiya.
 */
return new class extends Migration
{
    private const TABLES = [
        'bookings', 'availability_exceptions',
        'checkout_questions', 'coupons', 'product_addons', 'product_cover_images',
        'course_modules', 'course_lessons', 'quiz_questions', 'live_classes',
        'enrollments', 'event_registrations', 'assignment_submissions',
        'locked_content_files', 'locked_content_images',
        'store_header_buttons', 'autodm_rules', 'sub_admins', 'roles',
        'settlements', 'orders',
        'lesson_note_files', 'quizzes', 'lesson_assignments', 'certificates',
    ];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            if (! Schema::hasColumn($table, 'uuid')) {
                Schema::table($table, fn (Blueprint $t) => $t->uuid('uuid')->nullable()->after('id'));
            }
        }

        foreach ([...self::TABLES, 'products'] as $table) {
            $this->backfill($table);
        }

        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->uuid('uuid')->nullable(false)->change();
                $t->unique('uuid');
            });
        }

        // products.uuid pe unique index pehle se hai — sirf NOT NULL
        Schema::table('products', fn (Blueprint $t) => $t->uuid('uuid')->nullable(false)->change());
    }

    public function down(): void
    {
        Schema::table('products', fn (Blueprint $t) => $t->uuid('uuid')->nullable()->change());

        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $t) use ($table) {
                $t->dropUnique("{$table}_uuid_unique");
                $t->dropColumn('uuid');
            });
        }
    }

    private function backfill(string $table): void
    {
        DB::table($table)->whereNull('uuid')->orderBy('id')->chunkById(500, function ($rows) use ($table) {
            foreach ($rows as $row) {
                DB::table($table)->where('id', $row->id)->update(['uuid' => (string) Str::uuid()]);
            }
        });
    }
};
