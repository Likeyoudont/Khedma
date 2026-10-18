<?php

namespace Tests\Unit;

use App\Support\ResilientDatabaseStore;
use Illuminate\Database\QueryException;
use Illuminate\Database\SQLiteConnection;
use Mockery;
use PDOException;
use Tests\TestCase;

class ResilientDatabaseStoreTest extends TestCase
{
    public function test_a_rolled_back_locked_counter_transaction_can_retry(): void
    {
        $connection = Mockery::mock(SQLiteConnection::class);
        $connection->shouldReceive('getDriverName')->andReturn('sqlite');
        $error = new QueryException('sqlite', 'update cache', [], new PDOException('database is locked'));
        $connection->shouldReceive('transaction')->once()->ordered()->andThrow($error);
        $connection->shouldReceive('transaction')->once()->ordered()->andReturn(2);
        $store = new ResilientDatabaseStore($connection, 'cache');
        $this->assertSame(2, $store->increment('attempts'));
    }

    public function test_non_lock_errors_are_not_retried(): void
    {
        $connection = Mockery::mock(SQLiteConnection::class);
        $connection->shouldReceive('getDriverName')->andReturn('sqlite');
        $error = new QueryException('sqlite', 'update cache', [], new PDOException('no such table: cache'));
        $connection->shouldReceive('transaction')->once()->andThrow($error);
        $this->expectException(QueryException::class);
        (new ResilientDatabaseStore($connection, 'cache'))->increment('attempts');
    }

    public function test_lock_retry_is_bounded(): void
    {
        $connection = Mockery::mock(SQLiteConnection::class);
        $connection->shouldReceive('getDriverName')->andReturn('sqlite');
        $error = new QueryException('sqlite', 'update cache', [], new PDOException('database is locked'));
        $connection->shouldReceive('transaction')->times(10)->andThrow($error);
        $this->expectException(QueryException::class);
        (new ResilientDatabaseStore($connection, 'cache'))->increment('attempts');
    }
}
