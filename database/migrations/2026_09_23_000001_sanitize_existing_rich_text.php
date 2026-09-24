<?php

use App\Support\Html;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Save-time sanitization sirf naye data ko safe karti hai — jo raw HTML pehle se
 * stored hai wo public course page pe ab bhi execute hoga. Ye one-off backfill hai.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('products')
            ->select('id', 'description')
            ->whereNotNull('description')
            ->where('description', '!=', '')
            ->orderBy('id')
            ->chunkById(200, function ($rows) {
                foreach ($rows as $row) {
                    $clean = Html::sanitize($row->description);

                    if ($clean !== $row->description) {
                        DB::table('products')->where('id', $row->id)->update(['description' => $clean]);
                    }
                }
            });

        DB::table('lesson_text_contents')
            ->select('id', 'content')
            ->whereNotNull('content')
            ->where('content', '!=', '')
            ->orderBy('id')
            ->chunkById(200, function ($rows) {
                foreach ($rows as $row) {
                    $clean = Html::sanitize($row->content);

                    if ($clean !== $row->content) {
                        DB::table('lesson_text_contents')->where('id', $row->id)->update(['content' => $clean]);
                    }
                }
            });
    }

    public function down(): void
    {
        // stripped HTML wapas nahi aa sakta
    }
};
