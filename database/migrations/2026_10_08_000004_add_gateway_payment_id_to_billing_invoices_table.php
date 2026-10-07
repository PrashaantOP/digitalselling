<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Auto-renew ke har charge ka Razorpay payment id invoice pe. Unique — verify call aur
     * `subscription.charged` webhook dono aayein to bhi ek charge ka ek hi invoice.
     */
    public function up(): void
    {
        Schema::table('billing_invoices', function (Blueprint $table) {
            $table->string('gateway_payment_id', 100)->nullable()->unique()->after('plan_purchase_id');
        });
    }

    public function down(): void
    {
        Schema::table('billing_invoices', function (Blueprint $table) {
            $table->dropUnique(['gateway_payment_id']);
            $table->dropColumn('gateway_payment_id');
        });
    }
};
