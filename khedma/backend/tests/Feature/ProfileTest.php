<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\ServiceCategory;
use App\Models\SocialAccount;
use App\Models\User;
use Database\Seeders\ServiceCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_routes_require_authentication(): void
    {
        $this->getJson('/api/auth/settings')->assertUnauthorized();
        $this->getJson('/api/auth/export')->assertUnauthorized();
        $this->postJson('/api/auth/profile', [])->assertUnauthorized();
        $this->postJson('/api/auth/password', [])->assertUnauthorized();
    }

    public function test_client_can_edit_own_profile_but_cannot_change_role_or_another_account(): void
    {
        $user = User::factory()->create(['role' => 'ba7it', 'phone' => '+212612345678']);
        $other = User::factory()->create(['name' => 'Other account']);
        $this->actingAs($user)->postJson('/api/auth/profile', ['name' => 'New name', 'city' => 'Fès', 'phone' => '0612345678'])->assertOk()->assertJsonPath('user.name', 'New name')->assertJsonPath('user.phone', '+212612345678')->assertJsonMissingPath('user.password');
        foreach (['role' => 'mihaniy', 'user_id' => $other->id, 'email' => 'new@example.com', 'password' => 'new-password', 'available' => true] as $field => $value) {
            $this->postJson('/api/auth/profile', ['name' => 'Attacker', 'city' => 'Rabat', $field => $value])->assertUnprocessable();
        }
        $this->assertSame('New name', $user->fresh()->name);
        $this->assertSame('Other account', $other->fresh()->name);
    }

    public function test_phone_changes_require_current_password_and_normalize_before_unique_validation(): void
    {
        $user = User::factory()->create(['role' => 'ba7it', 'password' => 'original-password', 'phone' => '+212612345678']);
        User::factory()->create(['phone' => '+212622222222']);
        $payload = ['name' => 'Sara', 'city' => 'Rabat', 'phone' => '0633333333'];
        $this->actingAs($user)->postJson('/api/auth/profile', $payload)->assertUnprocessable();
        $this->postJson('/api/auth/profile', $payload + ['current_password' => 'wrong-password'])->assertUnprocessable();
        $this->postJson('/api/auth/profile', $payload + ['current_password' => 'original-password'])->assertOk()->assertJsonPath('user.phone', '+212633333333');
        $this->postJson('/api/auth/profile', array_merge($payload, ['phone' => '06 22 22 22 22', 'current_password' => 'original-password']))->assertUnprocessable();
        $this->assertSame('+212633333333', $user->fresh()->phone);
        $this->postJson('/api/auth/profile', array_merge($payload, ['phone' => 'invalid-phone']))->assertUnprocessable();
    }

    public function test_phone_only_account_cannot_remove_its_only_login_identity(): void
    {
        $user = User::factory()->create(['role' => 'ba7it', 'email' => null, 'phone' => '+212612345678', 'password' => 'original-password']);
        $this->actingAs($user)->postJson('/api/auth/profile', ['name' => 'Sara', 'city' => 'Rabat', 'phone' => null, 'current_password' => 'original-password'])->assertUnprocessable();
        $this->assertSame('+212612345678', $user->fresh()->phone);
    }

    public function test_social_account_can_add_contact_phone_without_password(): void
    {
        $user = User::factory()->create(['role' => 'ba7it', 'phone' => null]);
        SocialAccount::create(['user_id' => $user->id, 'provider' => 'google', 'subject' => 'social-subject']);
        $this->actingAs($user)->postJson('/api/auth/profile', ['name' => 'Sara', 'city' => 'Rabat', 'phone' => '0612345678'])->assertOk()->assertJsonPath('user.phone', '+212612345678');
    }

    public function test_worker_profile_changes_update_public_directory_and_request_availability(): void
    {
        $this->seed(ServiceCategorySeeder::class);
        $worker = User::factory()->create(['role' => 'mihaniy']);
        $payload = ['name' => 'Worker', 'city' => 'Fès', 'description' => 'Home repairs', 'experience_years' => 7, 'service_radius_km' => 25, 'available' => true, 'specialties' => ['plumbing', 'electricity']];
        $this->actingAs($worker)->postJson('/api/auth/profile', $payload)->assertOk()->assertJsonPath('user.worker_profile.available', true);
        $profile = $worker->fresh()->workerProfile;
        $this->getJson('/api/workers/'.$profile->id)->assertJsonPath('location', 'Fès')->assertJsonPath('experience', 7)->assertJsonCount(2, 'specialties')->assertJsonFragment(['specialties' => ['electricity', 'plumbing']]);
        $this->postJson('/api/auth/profile', array_merge($payload, ['name' => 'Invalid edit', 'specialties' => ['unknown']]))->assertUnprocessable();
        $this->assertSame('Worker', $worker->fresh()->name);
        $this->postJson('/api/auth/profile', array_merge($payload, ['available' => false, 'specialties' => ['plumbing']]))->assertOk();
        $this->getJson('/api/workers/'.$profile->id)->assertJsonPath('available', false)->assertJsonCount(1, 'specialties');
        $client = User::factory()->create(['role' => 'ba7it']);
        $this->actingAs($client)->postJson('/api/bookings', ['workerId' => $profile->id, 'service' => 'plumbing', 'location' => 'Rabat', 'description' => 'Fix tap'])->assertUnprocessable();
    }

    public function test_password_change_checks_current_password_confirmation_and_hashes_new_password(): void
    {
        $user = User::factory()->create(['role' => 'ba7it', 'password' => 'original-password']);
        $payload = ['current_password' => 'original-password', 'password' => 'replacement-password', 'password_confirmation' => 'replacement-password'];
        $this->actingAs($user)->postJson('/api/auth/password', array_merge($payload, ['current_password' => 'wrong']))->assertUnprocessable();
        $this->postJson('/api/auth/password', array_merge($payload, ['password_confirmation' => 'mismatch']))->assertUnprocessable();
        $this->assertTrue(Hash::check('original-password', $user->fresh()->password));
        $this->postJson('/api/auth/password', $payload)->assertOk()->assertJsonMissingPath('user.password');
        $this->assertTrue(Hash::check('replacement-password', $user->fresh()->password));
        $this->postJson('/api/auth/logout')->assertOk();
        $this->postJson('/api/auth/login', ['identity' => $user->email, 'password' => 'original-password'])->assertUnprocessable();
        $this->postJson('/api/auth/login', ['identity' => $user->email, 'password' => 'replacement-password'])->assertOk();
    }

    public function test_password_change_revokes_other_database_sessions_and_remember_tokens(): void
    {
        config(['session.driver' => 'database']);
        $user = User::factory()->create(['role' => 'ba7it', 'password' => 'original-password', 'remember_token' => 'old-token']);
        $other = User::factory()->create();
        \Illuminate\Support\Facades\DB::table('sessions')->insert([
            ['id' => 'other-device', 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()],
            ['id' => 'unrelated-user', 'user_id' => $other->id, 'payload' => '', 'last_activity' => time()],
        ]);
        $this->actingAs($user)->postJson('/api/auth/password', ['current_password' => 'original-password', 'password' => 'replacement-password', 'password_confirmation' => 'replacement-password'])->assertOk();
        $this->assertDatabaseMissing('sessions', ['id' => 'other-device']);
        $this->assertDatabaseHas('sessions', ['id' => 'unrelated-user']);
        $this->assertNotSame('old-token', $user->fresh()->getRememberToken());
        $this->getJson('/api/auth/me')->assertOk();
    }

    public function test_settings_identify_social_sign_in_without_exposing_provider_subjects(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->getJson('/api/auth/settings')->assertJson(['providers' => [], 'password_available' => true]);
        SocialAccount::create(['user_id' => $user->id, 'provider' => 'google', 'subject' => 'private-provider-subject']);
        $this->getJson('/api/auth/settings')->assertJson(['providers' => ['google'], 'password_available' => false])->assertDontSee('private-provider-subject');
    }

    public function test_data_export_only_contains_own_account_and_authorized_bookings(): void
    {
        $this->seed(ServiceCategorySeeder::class);
        $user = User::factory()->create(['role' => 'ba7it']);
        $other = User::factory()->create(['role' => 'ba7it']);
        $worker = User::factory()->create(['role' => 'mihaniy']);
        $profile = $worker->workerProfile()->create([]);
        $category = ServiceCategory::first();
        foreach ([$user->id => 'My booking', $other->id => 'Other private booking'] as $client => $description) {
            Booking::create(['client_id' => $client, 'worker_profile_id' => $profile->id, 'service_category_id' => $category->id, 'description' => $description, 'location' => 'Rabat', 'status' => 'pending']);
        }
        $this->actingAs($user)->getJson('/api/auth/export')->assertOk()
            ->assertHeader('Content-Disposition', 'attachment; filename="khedma-account.json"')
            ->assertJsonPath('account.email', $user->email)->assertJsonCount(1, 'bookings')
            ->assertJsonPath('bookings.0.description', 'My booking')
            ->assertJsonMissingPath('account.password')->assertDontSee('Other private booking')->assertDontSee($other->email);
        $this->actingAs($worker)->getJson('/api/auth/export')->assertJsonCount(2, 'bookings');
    }
}
