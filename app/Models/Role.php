<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Spatie\Permission\Models\Role as SpatieRole;

/** Spatie role + uuid — roles page ke URL me numeric id nahi jaati. config/permission.php isi ko use karta hai. */
class Role extends SpatieRole
{
    use HasUuid;
}
