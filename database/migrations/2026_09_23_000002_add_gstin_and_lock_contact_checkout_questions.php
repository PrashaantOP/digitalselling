<?php

use App\Http\Controllers\BaseProductController;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * GSTIN ab ek checkout question hai (pehle live page pe hardcoded tha), taaki creator
 * use Checkout experience se on/off kar sake. Saath hi email/phone ab hamesha collect
 * hote hain, to jo pehle off kiye gaye the unhe wapas on karna hai.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('checkout_questions')
            ->whereIn('field_type', BaseProductController::LOCKED_FIELD_TYPES)
            ->update(['is_required' => true, 'is_enabled' => true, 'updated_at' => now()]);

        DB::table('products')->select('id')->orderBy('id')->each(function (object $product): void {
            $exists = DB::table('checkout_questions')
                ->where('product_id', $product->id)
                ->where('label', 'GSTIN')
                ->exists();

            if ($exists) {
                return;
            }

            DB::table('checkout_questions')->insert([
                'product_id' => $product->id,
                'label' => 'GSTIN',
                'field_type' => 'text',
                'options' => null,
                'is_required' => false,
                'is_enabled' => true,
                'sort_order' => (int) DB::table('checkout_questions')->where('product_id', $product->id)->max('sort_order') + 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }

    public function down(): void
    {
        DB::table('checkout_questions')->where('label', 'GSTIN')->where('field_type', 'text')->delete();
    }
};
