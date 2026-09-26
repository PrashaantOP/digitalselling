<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Payment page ke optional sections: subtitle, "what's included" checklist, FAQs, aur buyer-info toggles. */
    public function up(): void
    {
        Schema::create('payment_page_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('subtitle', 150)->nullable();
            $table->json('whats_included')->nullable();
            $table->json('faqs')->nullable();
            // Email/phone hamesha collect hote hain (BaseProductController::LOCKED_FIELD_TYPES) — ye do optional hain.
            $table->boolean('collect_full_name')->default(true);
            $table->boolean('collect_note')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_page_details');
    }
};
