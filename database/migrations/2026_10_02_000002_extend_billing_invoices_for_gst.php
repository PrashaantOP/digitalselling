<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * billing_invoices ko GST tax invoice banao. `amount` GST-inclusive total hi rehta hai;
 * breakup naye columns me. Sab nullable — purani rows na tootein.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('billing_invoices', function (Blueprint $table) {
            $table->uuid('uuid')->nullable()->after('id');
            $table->foreignId('plan_purchase_id')->nullable()->after('subscription_id')->constrained('plan_purchases')->nullOnDelete();
            $table->decimal('taxable_amount', 10, 2)->nullable()->after('amount');
            $table->decimal('gst_rate', 5, 2)->nullable()->after('taxable_amount');
            $table->decimal('cgst_amount', 10, 2)->default(0)->after('gst_rate');
            $table->decimal('sgst_amount', 10, 2)->default(0)->after('cgst_amount');
            $table->decimal('igst_amount', 10, 2)->default(0)->after('sgst_amount');
            $table->decimal('credit_applied', 10, 2)->default(0)->after('igst_amount');
            $table->string('sac_code', 10)->nullable()->after('credit_applied');
            $table->string('description')->nullable()->after('sac_code');
            // buyer (creator) aur seller (platform) ka snapshot — baad me profile badle to invoice na badle
            $table->string('billing_name', 150)->nullable()->after('description');
            $table->string('billing_email', 150)->nullable()->after('billing_name');
            $table->string('billing_gstin', 20)->nullable()->after('billing_email');
            $table->string('billing_state', 50)->nullable()->after('billing_gstin');
            $table->json('seller')->nullable()->after('billing_state');
            $table->timestamp('period_start')->nullable()->after('seller');
            $table->timestamp('period_end')->nullable()->after('period_start');
        });

        DB::table('billing_invoices')->whereNull('uuid')->orderBy('id')->chunkById(500, function ($rows) {
            foreach ($rows as $row) {
                DB::table('billing_invoices')->where('id', $row->id)->update(['uuid' => (string) Str::uuid()]);
            }
        });

        Schema::table('billing_invoices', function (Blueprint $table) {
            $table->uuid('uuid')->nullable(false)->change();
            $table->unique('uuid');
        });
    }

    public function down(): void
    {
        Schema::table('billing_invoices', function (Blueprint $table) {
            $table->dropUnique('billing_invoices_uuid_unique');
            $table->dropConstrainedForeignId('plan_purchase_id');
            $table->dropColumn([
                'uuid', 'taxable_amount', 'gst_rate', 'cgst_amount', 'sgst_amount', 'igst_amount', 'credit_applied',
                'sac_code', 'description', 'billing_name', 'billing_email', 'billing_gstin', 'billing_state', 'seller', 'period_start', 'period_end',
            ]);
        });
    }
};
