<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Certificate ek record hai — issue ke waqt ka naam/course/creator yahin jam jaata hai (snapshot),
 * taaki baad me student naam badle ya creator course ka title, to purana certificate na badle.
 * `revoked_at`: creator ne radd kiya (jaise refund) — public verify page pe yahi dikhta hai.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('certificates', function (Blueprint $table) {
            $table->string('student_name', 150)->nullable()->after('certificate_number');
            $table->string('course_title', 150)->nullable()->after('student_name');
            $table->string('creator_name', 150)->nullable()->after('course_title');
            $table->timestamp('revoked_at')->nullable()->after('issued_at');
            $table->string('revoke_reason')->nullable()->after('revoked_at');
        });

        // maujooda certificates: abhi ka data hi unka snapshot ban jaata hai
        $rows = DB::table('certificates')
            ->join('enrollments', 'enrollments.id', '=', 'certificates.enrollment_id')
            ->join('customers', 'customers.id', '=', 'enrollments.customer_id')
            ->leftJoin('buyers', 'buyers.id', '=', 'customers.buyer_id')
            ->join('course_details', 'course_details.id', '=', 'enrollments.course_id')
            ->join('products', 'products.id', '=', 'course_details.product_id')
            ->join('users', 'users.id', '=', 'products.creator_id')
            ->whereNull('certificates.student_name')
            ->get(['certificates.id', 'buyers.name as buyer_name', 'customers.name as customer_name', 'products.title', 'users.name as creator']);

        foreach ($rows as $row) {
            DB::table('certificates')->where('id', $row->id)->update([
                'student_name' => $row->buyer_name ?: ($row->customer_name ?: 'Learner'),
                'course_title' => $row->title,
                'creator_name' => $row->creator,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('certificates', function (Blueprint $table) {
            $table->dropColumn(['student_name', 'course_title', 'creator_name', 'revoked_at', 'revoke_reason']);
        });
    }
};
