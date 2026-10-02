<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** Quiz / assignment ab free preview nahi ho sakte — jin pe pehle se on tha unka flag band. */
    public function up(): void
    {
        DB::table('course_lessons')->whereIn('type', ['quiz', 'assignment'])->where('is_free_preview', true)->update(['is_free_preview' => false]);
    }

    public function down(): void
    {
        // wapas nahi — kaun sa on tha ye yaad nahi rakha jaata
    }
};
