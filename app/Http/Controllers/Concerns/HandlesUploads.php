<?php

namespace App\Http\Controllers\Concerns;

use App\Support\Tenant;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * public disk  => images/avatars (seedha URL se dikhte hain)
 * local disk   => private files (books, locked content, KYC, submissions) — sirf controller se serve karo
 */
trait HandlesUploads
{
    protected function putPublic(UploadedFile $file, string $dir): string
    {
        return $file->store('creators/' . Tenant::id() . '/' . $dir, 'public');
    }

    protected function putPrivate(UploadedFile $file, string $dir): string
    {
        return $file->store('creators/' . Tenant::id() . '/' . $dir, 'local');
    }

    protected function deletePublic(?string $path): void
    {
        if ($path) {
            Storage::disk('public')->delete($path);
        }
    }

    protected function deletePrivate(?string $path): void
    {
        if ($path) {
            Storage::disk('local')->delete($path);
        }
    }
}
