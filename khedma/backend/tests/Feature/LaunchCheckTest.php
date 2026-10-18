<?php

namespace Tests\Feature;

use Database\Seeders\ServiceCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LaunchCheckTest extends TestCase
{
    use RefreshDatabase;

    public function test_local_check_detects_missing_services_and_succeeds_after_seeding(): void
    {
        $this->artisan('khedma:launch-check --local')->assertExitCode(1);
        $this->seed(ServiceCategorySeeder::class);
        $this->artisan('khedma:launch-check --local')->assertExitCode(0);
    }

    public function test_production_check_rejects_local_urls_and_disabled_mail_delivery(): void
    {
        $this->seed(ServiceCategorySeeder::class);
        config(['app.debug' => true, 'app.url' => 'http://localhost', 'services.password_recovery_enabled' => false, 'services.booking_email_enabled' => false]);
        $this->artisan('khedma:launch-check')->expectsOutputToContain('FAIL — Debug disabled')->assertExitCode(1);
    }

    public function test_paid_launch_requires_enabled_fees_even_when_the_catalogue_is_ready(): void
    {
        $this->seed(ServiceCategorySeeder::class);
        config(['billing.enabled' => false]);
        $this->artisan('khedma:launch-check --local --require-fees')
            ->expectsOutputToContain('FAIL — Connection fees enabled for a paid launch')->assertExitCode(1);
    }

    public function test_an_invalid_application_key_fails_without_exposing_its_value(): void
    {
        $this->seed(ServiceCategorySeeder::class);
        config(['app.key' => 'invalid-test-key']);
        $this->artisan('khedma:launch-check --local')
            ->expectsOutputToContain('FAIL — Application key configured')->assertExitCode(1);
    }

    public function test_default_seeding_does_not_create_sample_accounts_or_jobs(): void
    {
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
        $this->assertDatabaseCount('service_categories', 18);
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('worker_profiles', 0);
        $this->assertDatabaseCount('bookings', 0);
    }
}
