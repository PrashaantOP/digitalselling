<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Format dropdown ab upload types se match karta hai: PDF / EPUB / MOBI / ZIP ('other' hata diya). */
    public function up(): void
    {
        // pehle chauda karo taaki 'other' rows ko naye values me badal sakein, phir narrow
        Schema::table('book_details', function (Blueprint $table) {
            $table->enum('format', ['pdf', 'epub', 'other', 'mobi', 'zip'])->default('pdf')->change();
        });

        // 'other' = mobi/zip upload tha — file extension se asli format nikaalo, na mile to pdf
        DB::table('book_details')->where('format', 'other')->orderBy('id')->each(function ($row) {
            $ext = strtolower(pathinfo((string) $row->file_path, PATHINFO_EXTENSION));

            DB::table('book_details')->where('id', $row->id)->update(['format' => in_array($ext, ['mobi', 'zip'], true) ? $ext : 'pdf']);
        });

        Schema::table('book_details', function (Blueprint $table) {
            $table->enum('format', ['pdf', 'epub', 'mobi', 'zip'])->default('pdf')->change();
        });
    }

    public function down(): void
    {
        Schema::table('book_details', function (Blueprint $table) {
            $table->enum('format', ['pdf', 'epub', 'other', 'mobi', 'zip'])->default('pdf')->change();
        });

        DB::table('book_details')->whereIn('format', ['mobi', 'zip'])->update(['format' => 'other']);

        Schema::table('book_details', function (Blueprint $table) {
            $table->enum('format', ['pdf', 'epub', 'other'])->default('pdf')->change();
        });
    }
};
