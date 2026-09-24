<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('products') || ! Schema::hasTable('checkout_questions')) {
            return;
        }

        $states = [
            'Andhra Pradesh',
            'Arunachal Pradesh',
            'Assam',
            'Bihar',
            'Chhattisgarh',
            'Goa',
            'Gujarat',
            'Haryana',
            'Himachal Pradesh',
            'Jharkhand',
            'Karnataka',
            'Kerala',
            'Madhya Pradesh',
            'Maharashtra',
            'Manipur',
            'Meghalaya',
            'Mizoram',
            'Nagaland',
            'Odisha',
            'Punjab',
            'Rajasthan',
            'Sikkim',
            'Tamil Nadu',
            'Telangana',
            'Tripura',
            'Uttar Pradesh',
            'Uttarakhand',
            'West Bengal',
            'Andaman and Nicobar Islands',
            'Chandigarh',
            'Dadra and Nagar Haveli and Daman and Diu',
            'Delhi',
            'Jammu and Kashmir',
            'Ladakh',
            'Lakshadweep',
            'Puducherry',
        ];

        DB::table('products')->select('id')->orderBy('id')->each(function (object $product) use ($states): void {
            $defaults = [
                ['label' => 'Email address', 'field_type' => 'email', 'options' => null],
                ['label' => 'Phone number', 'field_type' => 'phone', 'options' => null],
                ['label' => 'State', 'field_type' => 'dropdown', 'options' => json_encode($states)],
            ];

            foreach ($defaults as $i => $default) {
                if (! DB::table('checkout_questions')->where('product_id', $product->id)->where('field_type', $default['field_type'])->exists()) {
                    DB::table('checkout_questions')->insert([
                        'product_id' => $product->id,
                        'label' => $default['label'],
                        'field_type' => $default['field_type'],
                        'options' => $default['options'],
                        'is_required' => true,
                        'sort_order' => $i,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            DB::table('checkout_questions')
                ->where('product_id', $product->id)
                ->where('field_type', 'dropdown')
                ->where('label', 'State')
                ->update(['is_required' => false, 'is_enabled' => true, 'updated_at' => now()]);
        });
    }

    public function down(): void
    {
        // Keep creator-customised checkout fields intact on rollback.
    }
};
