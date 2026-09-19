<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kyc_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('legal_name', 150);
            $table->string('pan_number', 15);
            $table->string('gst_number', 20)->nullable();
            $table->string('bank_account_holder', 150)->nullable();
            $table->string('bank_account_number', 30)->nullable();
            $table->string('ifsc', 15)->nullable();
            $table->string('id_document_path')->nullable();
            $table->enum('status', ['not_started', 'pending', 'verified', 'rejected'])->default('not_started');
            $table->string('rejection_reason')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kyc_verifications');
    }
};
