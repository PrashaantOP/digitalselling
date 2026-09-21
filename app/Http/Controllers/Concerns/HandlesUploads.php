<?php

namespace App\Http\Controllers\Concerns;

use App\Support\Tenant;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * assets disk  => public/assets me images/avatars (seedha /assets/... URL se dikhte hain)
 * local disk   => private files (books, locked content, KYC, submissions) — sirf controller se serve karo
 */
trait HandlesUploads
{
    protected function putPublic(UploadedFile $file, string $page, ?int $userId = null): string
    {
        $username = User::whereKey($userId ?? Tenant::id())->value('username') ?: 'creator-' . ($userId ?? Tenant::id());

        return $file->store('images/' . $username . '/' . trim($page, '/'), 'assets');
    }

    protected function putPublicSecure(UploadedFile $file, string $dir): string
    {
        return $this->putPublic($file, $dir);
    }

    protected function putPrivate(UploadedFile $file, string $dir): string
    {
        return $file->store('creators/' . Tenant::id() . '/' . $dir, 'local');
    }

    protected function deletePublic(?string $path): void
    {
        if ($path) {
            Storage::disk('assets')->delete($path);
        }
    }

    protected function deletePrivate(?string $path): void
    {
        if ($path) {
            Storage::disk('local')->delete($path);
        }
    }
}
