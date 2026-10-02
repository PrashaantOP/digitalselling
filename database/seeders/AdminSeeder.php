<?php

namespace Database\Seeders;

use App\Models\Admin;
use Illuminate\Database\Seeder;

/**
 * Platform admin ka login (/admin/login). Dobara chalana safe hai — wahi email ho to row update hoti hai,
 * doosri nahi banti.
 *
 *   php artisan db:seed --class=AdminSeeder
 */
class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $admin = Admin::firstOrNew(['email' => 'pk12345@gmail.com']);
        $admin->name = $admin->name ?: 'Admin';
        // password / is_active fillable nahi hain (jaan-boojh kar) — isliye forceFill
        $admin->forceFill(['password' => 'sachin@12345', 'is_active' => true])->save();
    }
}
