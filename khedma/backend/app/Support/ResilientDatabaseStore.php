<?php

namespace App\Support;

use Closure;
use Illuminate\Cache\DatabaseStore;
use Illuminate\Database\QueryException;

class ResilientDatabaseStore extends DatabaseStore
{
    protected function incrementOrDecrement($key, $value, Closure $callback)
    {
        // SQLite on PHP < 8.4 cannot use Laravel's IMMEDIATE transaction mode.
        // A failed read-to-write upgrade must roll back before trying again.
        for ($attempt = 1; ; $attempt++) {
            try {
                return parent::incrementOrDecrement($key, $value, $callback);
            } catch (QueryException $error) {
                if ($attempt >= 10 || $this->connection->getDriverName() !== 'sqlite' ||
                    ! preg_match('/database (?:table )?is locked/i', $error->getMessage())) {
                    throw $error;
                }
                usleep(random_int(1000, 5000) * $attempt);
            }
        }
    }
}
