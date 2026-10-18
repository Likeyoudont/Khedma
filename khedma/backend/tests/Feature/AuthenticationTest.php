<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\ServiceCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    private function account(array $overrides = []): array
    {
        return array_merge(['name' => 'Sara', 'identity' => 'sara@example.com', 'password' => 'secure-password', 'city' => 'Salé', 'role' => 'ba7it'], $overrides);
    }

    public function test_registration_hashes_password_and_creates_session(): void
    {
        $this->postJson('/api/auth/register', $this->account())->assertCreated()->assertJsonPath('user.role', 'ba7it')->assertJsonMissingPath('user.password');
        $this->assertTrue(Hash::check('secure-password', User::first()->password));
        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('user.email', 'sara@example.com');
        $this->postJson('/api/auth/logout')->assertOk();
        $this->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_phone_worker_registration_creates_profile_and_specialties_atomically(): void
    {
        $this->seed(ServiceCategorySeeder::class);
        $payload = $this->account(['identity' => '06 12 34 56 78', 'role' => 'mihaniy', 'description' => 'Plumber', 'experience_years' => 5, 'service_radius_km' => 10, 'available' => true, 'specialties' => ['plumbing']]);
        $this->postJson('/api/auth/register', $payload)->assertCreated()->assertJsonPath('user.phone', '+212612345678')->assertJsonPath('user.email', null)->assertJsonPath('user.worker_profile.service_categories.0.key', 'plumbing');
        $this->postJson('/api/auth/logout')->assertOk();
        $this->postJson('/api/auth/login', ['identity' => '+212612345678', 'password' => 'secure-password', 'role' => 'ba7it'])->assertOk()->assertJsonPath('user.role', 'mihaniy');
    }

    public function test_invalid_or_duplicate_registration_does_not_create_accounts(): void
    {
        $this->postJson('/api/auth/register', $this->account(['role' => 'admin']))->assertUnprocessable();
        $this->postJson('/api/auth/register', $this->account(['password' => 'short']))->assertUnprocessable();
        $this->postJson('/api/auth/register', $this->account(['role' => 'mihaniy', 'specialties' => ['unknown']]))->assertUnprocessable();
        $this->assertDatabaseCount('users', 0);
        $this->postJson('/api/auth/register', $this->account())->assertCreated();
        $this->postJson('/api/auth/register', $this->account(['identity' => 'SARA@example.com']))->assertUnprocessable();
        $this->assertDatabaseCount('users', 1);
    }

    public function test_each_moroccan_prefix_can_register_and_sign_in_using_pasted_international_format(): void
    {
        foreach (['05', '06', '07'] as $prefix) {
            $this->postJson('/api/auth/register', $this->account(['identity' => $prefix.' 12 34 56 78']))
                ->assertCreated()->assertJsonPath('user.phone', '+212'.substr($prefix, 1).'12345678');
            $this->postJson('/api/auth/logout')->assertOk();
            $this->postJson('/api/auth/login', ['identity' => '+212 (0)'.substr($prefix, 1).' 12 34 56 78', 'password' => 'secure-password'])
                ->assertOk()->assertJsonPath('user.phone', '+212'.substr($prefix, 1).'12345678');
            $this->postJson('/api/auth/logout')->assertOk();
        }
        $this->assertDatabaseCount('users', 3);
    }

    public function test_equivalent_moroccan_formats_report_a_duplicate_phone_instead_of_creating_another_account(): void
    {
        $this->postJson('/api/auth/register', $this->account(['identity' => '07 12 34 56 78']))->assertCreated();
        $this->postJson('/api/auth/logout')->assertOk();
        $this->postJson('/api/auth/register', $this->account(['identity' => '٠٠٢١٢ (٠)٧ ١٢ ٣٤ ٥٦ ٧٨']))
            ->assertUnprocessable()->assertJsonValidationErrors(['phone']);
        $this->assertDatabaseCount('users', 1);
    }

    public function test_non_text_phone_payload_is_a_validation_error_and_creates_no_account(): void
    {
        $this->postJson('/api/auth/register', $this->account(['phone' => ['0612345678']]))
            ->assertUnprocessable()->assertJsonValidationErrors(['phone']);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_wrong_password_does_not_authenticate_and_login_uses_stored_role(): void
    {
        User::factory()->create(['email' => 'sara@example.com', 'password' => 'secure-password', 'role' => 'mihaniy']);
        $this->getJson('/api/auth/me')->assertUnauthorized();
        $this->postJson('/api/auth/login', ['identity' => 'sara@example.com', 'password' => 'wrong'])->assertUnprocessable();
        $this->getJson('/api/auth/me')->assertUnauthorized();
        $this->postJson('/api/auth/login', ['identity' => 'sara@example.com', 'password' => 'secure-password', 'role' => 'ba7it'])->assertOk()->assertJsonPath('user.role', 'mihaniy');
    }

    public function test_login_is_rate_limited(): void
    {
        for ($i = 0; $i < 6; $i++) {
            $this->postJson('/api/auth/login', ['identity' => 'nobody@example.com', 'password' => 'wrong'])->assertUnprocessable();
        }
        $this->postJson('/api/auth/login', ['identity' => 'nobody@example.com', 'password' => 'wrong'])->assertStatus(429);
    }

    public function test_different_people_on_one_network_do_not_share_the_six_attempt_limit(): void
    {
        for ($i = 0; $i < 8; $i++) {
            $this->postJson('/api/auth/login', ['identity' => "person$i@example.test", 'password' => 'wrong'])->assertUnprocessable();
        }
    }

    public function test_login_limit_normalizes_phone_formats_and_email_case(): void
    {
        foreach ([' Nobody@Example.test ', 'nobody@example.test'] as $identity) {
            for ($i = 0; $i < 3; $i++) $this->postJson('/api/auth/login', ['identity' => $identity, 'password' => 'wrong'])->assertUnprocessable();
        }
        $this->postJson('/api/auth/login', ['identity' => 'NOBODY@example.test', 'password' => 'wrong'])->assertStatus(429);
        foreach (['0612345678', '+212 (0)6 12 34 56 78'] as $identity) {
            for ($i = 0; $i < 3; $i++) $this->postJson('/api/auth/login', ['identity' => $identity, 'password' => 'wrong'])->assertUnprocessable();
        }
        $this->postJson('/api/auth/login', ['identity' => '٠٦١٢٣٤٥٦٧٨', 'password' => 'wrong'])->assertStatus(429);
    }

    public function test_login_has_a_network_wide_ceiling(): void
    {
        for ($i = 0; $i < 120; $i++) {
            $this->postJson('/api/auth/login', ['identity' => "ceiling$i@example.test", 'password' => 'wrong'])->assertUnprocessable();
        }
        $this->postJson('/api/auth/login', ['identity' => 'another@example.test', 'password' => 'wrong'])->assertStatus(429);
    }
}
