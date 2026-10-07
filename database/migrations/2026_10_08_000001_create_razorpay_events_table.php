<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Razorpay webhook ke events jo process ho chuke — wahi event dobara aaye (retry) to skip. */
    public function up(): void
    {
        Schema::create('razorpay_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_id', 100)->unique(); // X-Razorpay-Event-Id
            $table->string('event', 60);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('razorpay_events');
    }
};
