<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Str;

/**
 * Email ke header me kiska brand dikhe.
 *  - platform()   — creator / admin / security mails: APP_NAME wordmark
 *  - forCreator() — buyer ko jaane wale mails: creator ka store avatar + naam (neeche "Powered by")
 *
 * `<x-mail::message :brand="$brand">` isi array ko leta hai; brand na diya ho to platform.
 *
 * @phpstan-type Brand array{name: string, avatar_url: ?string, initial: string, url: string, creator: bool}
 */
class MailBrand
{
    /** @return Brand */
    public static function platform(): array
    {
        $name = (string) config('app.name');

        return [
            'name' => $name,
            'avatar_url' => null,
            'initial' => Str::upper(Str::substr($name, 0, 1)) ?: 'D',
            'url' => (string) config('app.url'),
            'creator' => false,
        ];
    }

    /** Creator delete (soft) ho gaya ho to bhi uska naam — caller withTrashed relation se laaye. @return Brand */
    public static function forCreator(?User $creator): array
    {
        if (! $creator) {
            return self::platform();
        }

        $store = $creator->relationLoaded('store') ? $creator->store : $creator->store()->first();
        $name = trim((string) ($store?->display_name ?: $creator->name)) ?: (string) config('app.name');
        $avatar = $store?->avatar ?: $creator->avatar;
        $username = $store?->username ?: $creator->username;

        return [
            'name' => $name,
            // avatar public/assets me hai (OrderService checkout window jaisa); poora http url, warna inbox me nahi khulta
            'avatar_url' => $avatar ? (Str::startsWith($avatar, ['http://', 'https://']) ? $avatar : url('/assets/' . ltrim($avatar, '/'))) : null,
            'initial' => Str::upper(Str::substr($name, 0, 1)),
            'url' => $username ? url('/' . $username) : (string) config('app.url'),
            'creator' => true,
        ];
    }
}
