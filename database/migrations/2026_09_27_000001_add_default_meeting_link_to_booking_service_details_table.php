<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking_service_details', function (Blueprint $table) {
            // har nayi booking me copy hota hai; kisi ek booking ka link alag se badla ja sakta hai
            $table->string('default_meeting_link', 500)->nullable()->after('duration_minutes');
        });
    }

    public function down(): void
    {
        Schema::table('booking_service_details', function (Blueprint $table) {
            $table->dropColumn('default_meeting_link');
        });
    }
};
