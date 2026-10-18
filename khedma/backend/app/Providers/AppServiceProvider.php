<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \Illuminate\Support\Facades\Cache::extend('database', function ($app, array $config) {
            $store = new \App\Support\ResilientDatabaseStore(
                $app['db']->connection($config['connection'] ?? null),
                $config['table'],
                $config['prefix'] ?? $app['config']['cache.prefix'],
                $config['lock_table'] ?? 'cache_locks',
                $config['lock_lottery'] ?? [2, 100],
                $config['lock_timeout'] ?? 86400,
                $app['config']['cache.serializable_classes'],
            );
            $store->setLockConnection($app['db']->connection($config['lock_connection'] ?? $config['connection'] ?? null));
            return $app['cache']->repository($store, $config);
        });
        // Separate people sharing a network while retaining an IP-wide ceiling.
        RateLimiter::for('login', function (Request $request) {
            $raw = $request->input('identity');
            $identity = is_string($raw) ? strtolower(trim($raw)) : '';
            if ($identity !== '' && ! str_contains($identity, '@')) {
                try { $identity = \App\Support\PhoneNumber::normalize($identity, 'identity'); }
                catch (\Illuminate\Validation\ValidationException) { /* Invalid input is still throttled. */ }
            }
            return [
                Limit::perMinute(120)->by('login-ip:'.$request->ip()),
                Limit::perMinute(6)->by('login-identity:'.$request->ip().':'.hash('sha256', $identity)),
            ];
        });
        ResetPassword::createUrlUsing(fn ($user, $token) => rtrim(config('services.frontend_url'), '/').'/reset-password?'.http_build_query(['token' => $token, 'email' => $user->email]));
        RateLimiter::for('booking-fee-checkout', fn (Request $request) => Limit::perMinute(6)->by('fee-checkout:'.$request->user()->id));
        RateLimiter::for('booking-fee-receipt', fn (Request $request) => Limit::perMinute(120)->by('fee-receipt:'.$request->ip()));
    }
}
