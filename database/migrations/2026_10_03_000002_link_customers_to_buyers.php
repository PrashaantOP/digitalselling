<?php

use App\Support\Phone;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Har creator ka customer row ek buyer se jodo. Portal ab `buyer_id` se chalta hai, phone se nahi —
 * checkout pe phone verify nahi hota, isliye phone se jodna doosre ki kharid dikha sakta tha.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->foreignId('buyer_id')->nullable()->after('creator_id')->constrained('buyers')->nullOnDelete();
            // ek creator ke paas ek buyer ki ek hi row (NULL buyer_id wali purani rows is unique me nahi aati)
            $table->unique(['creator_id', 'buyer_id']);
        });

        // Backfill: email wali rows ke liye buyer banao/jodo. Purani rows pehle — phone takraav me unhe phone milta hai.
        $skipped = [];

        DB::table('customers')->whereNotNull('email')->where('email', '!=', '')->orderBy('id')->chunkById(500, function ($rows) use (&$skipped) {
            foreach ($rows as $row) {
                $email = Str::lower(trim($row->email));
                $buyer = DB::table('buyers')->where('email', $email)->first();

                if (! $buyer) {
                    $phone = Phone::normalize($row->phone);
                    $phoneTaken = $phone === null || DB::table('buyers')->where('phone', $phone)->exists();

                    $id = DB::table('buyers')->insertGetId([
                        'uuid' => (string) Str::uuid(),
                        'email' => $email,
                        'name' => $row->name,
                        'phone' => $phoneTaken ? null : $phone,
                        'created_at' => $row->created_at ?? now(),
                        'updated_at' => now(),
                    ]);
                    $buyer = (object) ['id' => $id];

                    if ($phoneTaken && $phone !== null) {
                        $skipped[] = "buyer {$email}: phone already belongs to an older buyer";
                    }
                }

                // isi creator ke paas is buyer ki row pehle se ho (do phone se kharida) to doosri row akeli rehti hai
                if (DB::table('customers')->where('creator_id', $row->creator_id)->where('buyer_id', $buyer->id)->exists()) {
                    $skipped[] = "customer #{$row->id}: creator already has a row for {$email}";

                    continue;
                }

                DB::table('customers')->where('id', $row->id)->update(['buyer_id' => $buyer->id]);
            }
        });

        if ($skipped) {
            Log::warning('link_customers_to_buyers: rows needing a manual look', $skipped);
        }
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropUnique(['creator_id', 'buyer_id']);
            $table->dropConstrainedForeignId('buyer_id');
        });
    }
};
