<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pro plan auto-renew (Razorpay Subscriptions). Status ab Razorpay jaise:
     * created → authenticated → active → (pending → halted) / cancelled / completed.
     * Period dates time ke saath (Razorpay unix time deta hai).
     */
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->string('status', 20)->default('created')->change();
            $table->dateTime('current_period_start')->nullable()->change();
            $table->dateTime('current_period_end')->nullable()->change();
            $table->uuid('uuid')->nullable()->after('id');
            $table->boolean('cancel_at_period_end')->default(false)->after('cancelled_at');
            $table->timestamp('last_charged_at')->nullable()->after('cancel_at_period_end');
            $table->string('failure_reason', 255)->nullable()->after('last_charged_at');
        });

        foreach (DB::table('subscriptions')->whereNull('uuid')->pluck('id') as $id) {
            DB::table('subscriptions')->where('id', $id)->update(['uuid' => (string) Str::uuid()]);
        }

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->unique('uuid');
            $table->index('gateway_subscription_id');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropIndex(['gateway_subscription_id']);
            $table->dropUnique(['uuid']);
            $table->dropColumn(['uuid', 'cancel_at_period_end', 'last_charged_at', 'failure_reason']);
        });
    }
};
