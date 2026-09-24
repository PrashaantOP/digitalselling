<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Book page ke optional sections: title ke neeche ek line, "What's inside" checklist aur FAQs. */
    public function up(): void
    {
        Schema::table('book_details', function (Blueprint $table) {
            $table->string('subtitle', 150)->nullable()->after('author_name');
            $table->json('whats_inside')->nullable()->after('external_link');
            $table->json('faqs')->nullable()->after('whats_inside');
        });
    }

    public function down(): void
    {
        Schema::table('book_details', function (Blueprint $table) {
            $table->dropColumn(['subtitle', 'whats_inside', 'faqs']);
        });
    }
};
