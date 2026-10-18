<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Encryption\Encrypter;
use App\Support\ConnectionFees;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class LaunchCheck extends Command
{
    protected $signature = 'khedma:launch-check {--local : Check local application data without production settings} {--require-fees : Require enabled fees for a paid launch}';
    protected $description = 'Check deployment configuration and application data without displaying secrets';

    public function handle(): int
    {
        $failed = 0;
        $check = function (string $label, bool $ok) use (&$failed) {
            $this->line(($ok ? 'PASS' : 'FAIL').' — '.$label);
            if (! $ok) $failed++;
        };
        $key = (string) config('app.key');
        $decodedKey = str_starts_with($key, 'base64:') ? base64_decode(substr($key, 7), true) : $key;
        $check('Application key configured', is_string($decodedKey) && Encrypter::supported($decodedKey, (string) config('app.cipher')));
        if (! $this->option('local')) {
            $check('Production environment', app()->environment('production'));
            $check('Debug disabled', ! config('app.debug'));
            $app = rtrim(config('app.url'), '/');
            $frontend = rtrim(config('services.frontend_url'), '/');
            $check('HTTPS application and frontend URLs on the same origin', str_starts_with($app, 'https://') && $app === $frontend);
            $check('Secure, HTTP-only session cookies', (bool) config('session.secure') && (bool) config('session.http_only'));
            $check('Database sessions for password-reset revocation', config('session.driver') === 'database');
            $realMail = in_array(config('mail.default'), ['smtp', 'ses', 'postmark', 'resend', 'sendmail'], true);
            $check('Email recovery enabled with real mail transport', (bool) config('services.password_recovery_enabled') && $realMail);
            $check('Booking email alerts enabled with queued delivery', (bool) config('services.booking_email_enabled') && $realMail && in_array(config('queue.default'), ['database', 'redis', 'sqs', 'beanstalkd'], true));
            $check('Real sender email configured', (bool) filter_var(config('mail.from.address'), FILTER_VALIDATE_EMAIL) && ! str_ends_with(config('mail.from.address', ''), '@example.com'));
        }
        if ($this->option('require-fees')) $check('Connection fees enabled for a paid launch', (bool) config('billing.enabled'));
        if (! config('billing.enabled')) $this->line('INFO — Connection fees are disabled; new jobs collect no platform fee.');
        if (config('billing.enabled')) $check('Connection-fee merchant adapter configured', ConnectionFees::ready());
        try {
            DB::select('SELECT 1');
            $check('Database reachable', true);
            $migrator = app('migrator');
            $files = $migrator->getMigrationFiles(database_path('migrations'));
            $ran = $migrator->getRepository()->getRan();
            $check('All database migrations applied', count(array_diff(array_keys($files), $ran)) === 0);
            $keys = ['plumbing', 'electricity', 'painting', 'doors', 'walls', 'cleaning', 'moving', 'garden', 'metalwork', 'air_conditioning', 'appliances', 'aluminium', 'glass', 'butcher', 'other', 'carpentry', 'locksmith', 'tiling'];
            $check('All 18 service categories available', Schema::hasTable('service_categories') && DB::table('service_categories')->whereIn('key', $keys)->count() === count($keys));
        } catch (\Throwable) {
            $check('Database and migrations readable', false);
        }
        $this->newLine();
        $this->line('This checks configuration and database state. Verify live mail delivery, queue supervision, backup restore and a client/worker pilot before launch. Verify Cash Plus checkout and refund delivery before enabling connection fees. Phone-only password recovery is not connected.');
        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
