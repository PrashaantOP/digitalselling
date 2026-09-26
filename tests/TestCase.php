<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Safety: RefreshDatabase poora DB reset karta hai. Agar config cache (bootstrap/cache/config.php) ki wajah se
     * phpunit.xml ka DB_DATABASE ignore ho jaye to tests asli dev DB wipe kar dete hain — isliye yahi ruk jao.
     */
    protected function setUpTraits()
    {
        $connection = config('database.default');
        $database = (string) config("database.connections.{$connection}.database");

        if ($connection !== 'sqlite' && ! str_ends_with($database, '_test')) {
            throw new \RuntimeException(
                "Refusing to run tests against database [{$database}]. Run `php artisan optimize:clear` and check phpunit.xml DB_DATABASE."
            );
        }

        return parent::setUpTraits();
    }
}
