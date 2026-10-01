<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * login_otps.expires_at table ka pehla NOT NULL `timestamp` tha — MySQL aise column ko chupchaap
 * `ON UPDATE CURRENT_TIMESTAMP` de deta hai. Nateeja: ek galat code daalte hi (attempts++ = row update)
 * expiry DB ki "abhi" pe reset ho jaati thi; DB ka timezone app (UTC) se alag ho to code 10 minute ki jagah
 * ghanton zinda rehta. DATETIME me koi auto-update nahi hota.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('login_otps', function (Blueprint $table) {
            $table->dateTime('expires_at')->change();
        });
    }

    public function down(): void
    {
        Schema::table('login_otps', function (Blueprint $table) {
            $table->timestamp('expires_at')->change();
        });
    }
};
