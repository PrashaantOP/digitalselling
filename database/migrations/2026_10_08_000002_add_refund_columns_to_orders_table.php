<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Refund ka hisaab — kis refund id se, kab, kyun, kis admin ne; Razorpay pe atka to `refund_status` = failed. */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('refund_id', 100)->nullable()->after('gateway_payment_id');
            $table->string('refund_status', 20)->nullable()->after('refund_id'); // processed | failed
            $table->timestamp('refunded_at')->nullable()->after('refund_status');
            $table->string('refund_reason', 255)->nullable()->after('refunded_at');
            $table->foreignId('refunded_by_admin_id')->nullable()->after('refund_reason')->constrained('admins')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('refunded_by_admin_id');
            $table->dropColumn(['refund_id', 'refund_status', 'refunded_at', 'refund_reason']);
        });
    }
};
