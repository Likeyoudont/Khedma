<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\ServiceCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkerSignupOptionsTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $changes = []): array
    {
        return array_merge([
            'name' => 'Transport worker', 'identity' => '0612345678', 'email' => 'worker@example.com',
            'password' => 'secure-password', 'city' => 'Casablanca', 'role' => 'mihaniy',
            'description' => 'Local deliveries', 'experience_years' => 3, 'service_radius_km' => 2,
            'available' => true, 'specialties' => ['moving'], 'transport_vehicles' => ['triporteur', 'car'],
            'latitude' => 33.5731, 'longitude' => -7.5898,
        ], $changes);
    }

    public function test_worker_signup_persists_contacts_radius_location_and_public_transport(): void
    {
        $this->seed(ServiceCategorySeeder::class);
        $this->postJson('/api/auth/register', $this->payload())->assertCreated()
            ->assertJsonPath('user.phone', '+212612345678')->assertJsonPath('user.email', 'worker@example.com')
            ->assertJsonPath('user.worker_profile.service_radius_km', 2)
            ->assertJsonPath('user.worker_profile.transport_vehicles', ['triporteur', 'car'])
            ->assertJsonPath('user.worker_profile.latitude', 33.5731);
        $profile = User::first()->workerProfile;
        $this->getJson('/api/workers/'.$profile->id)->assertOk()
            ->assertJsonPath('transportVehicles', ['triporteur', 'car'])->assertJsonPath('serviceRadiusKm', 2)
            ->assertJsonMissingPath('phone')->assertJsonMissingPath('email')->assertJsonMissingPath('latitude');
        $this->postJson('/api/auth/logout')->assertOk();
        $this->postJson('/api/auth/login', ['identity' => 'worker@example.com', 'password' => 'secure-password'])->assertOk();
    }

    public function test_fractional_radius_survives_signup_profile_edits_and_public_directory(): void
    {
        $this->seed(ServiceCategorySeeder::class);
        $this->postJson('/api/auth/register', $this->payload(['service_radius_km' => 0.5]))->assertCreated()
            ->assertJsonPath('user.worker_profile.service_radius_km', 0.5);
        $profile = User::first()->workerProfile;
        $this->getJson('/api/workers/'.$profile->id)->assertJsonPath('serviceRadiusKm', 0.5);
        $payload = $this->payload(['service_radius_km' => 2.75]);
        unset($payload['identity'], $payload['password'], $payload['email'], $payload['role']);
        $this->postJson('/api/auth/profile', $payload)->assertOk();
        $this->getJson('/api/workers/'.$profile->id)->assertJsonPath('serviceRadiusKm', 2.75);
        $this->postJson('/api/auth/profile', array_merge($payload, ['service_radius_km' => 0.25]))->assertUnprocessable();
    }

    public function test_invalid_transport_and_coordinates_do_not_create_a_worker(): void
    {
        $this->seed(ServiceCategorySeeder::class);
        foreach ([['transport_vehicles' => ['spaceship']], ['transport_vehicles' => ['car', 'car']], ['latitude' => 91], ['longitude' => null], ['service_radius_km' => 501]] as $changes) {
            $this->postJson('/api/auth/register', $this->payload($changes))->assertUnprocessable();
        }
        $this->assertDatabaseCount('users', 0);
    }

    public function test_profile_transport_changes_are_visible_and_cleared_when_transport_is_removed(): void
    {
        $this->seed(ServiceCategorySeeder::class);
        $this->postJson('/api/auth/register', $this->payload())->assertCreated();
        $profile = User::first()->workerProfile;
        $payload = $this->payload(['transport_vehicles' => ['bike', 'van']]);
        unset($payload['identity'], $payload['password'], $payload['email'], $payload['role']);
        $this->postJson('/api/auth/profile', $payload)->assertOk();
        $this->getJson('/api/workers/'.$profile->id)->assertJsonPath('transportVehicles', ['bike', 'van']);
        $this->postJson('/api/auth/profile', array_merge($payload, ['specialties' => ['aluminium', 'glass', 'butcher']]))->assertOk();
        $this->getJson('/api/workers/'.$profile->id)->assertJsonPath('transportVehicles', [])->assertJsonCount(3, 'specialties');
        $this->assertSame([], $profile->fresh()->transport_vehicles);
    }

    public function test_other_work_requires_a_trade_name_and_is_public_and_bookable(): void
    {
        $this->seed(ServiceCategorySeeder::class);
        $payload = $this->payload(['specialties' => ['other'], 'transport_vehicles' => []]);
        $this->postJson('/api/auth/register', $payload)->assertUnprocessable()->assertJsonValidationErrors('other_work');
        $this->postJson('/api/auth/register', $payload + ['other_work' => 'Tailoring'])->assertCreated()
            ->assertJsonPath('user.worker_profile.other_work', 'Tailoring');
        $worker = User::first();
        $profile = $worker->workerProfile;
        $this->getJson('/api/workers/'.$profile->id)->assertJsonPath('otherWork', 'Tailoring')->assertJsonPath('specialties', ['other']);
        $edit = array_merge($payload, ['other_work' => 'Shoe repair']);
        unset($edit['identity'], $edit['email'], $edit['password'], $edit['role']);
        $this->postJson('/api/auth/profile', $edit)->assertOk()->assertJsonPath('user.worker_profile.other_work', 'Shoe repair');
        $this->postJson('/api/auth/profile', array_merge($edit, ['other_work' => '']))->assertUnprocessable();
        $this->actingAs(User::factory()->create(['role' => 'ba7it']))->postJson('/api/bookings', ['workerId' => $profile->id, 'service' => 'other', 'location' => 'Rabat', 'description' => 'Repair shoes'])->assertCreated();
        $this->actingAs($worker)->postJson('/api/auth/profile', array_merge($edit, ['specialties' => ['plumbing']]))->assertOk();
        $this->getJson('/api/workers/'.$profile->id)->assertJsonPath('otherWork', null);
        $this->assertNull($profile->fresh()->other_work);
    }

    public function test_social_signup_also_saves_transport_options(): void
    {
        $this->seed(ServiceCategorySeeder::class);
        $payload = $this->payload();
        unset($payload['identity'], $payload['password'], $payload['email']);
        $this->withSession(['social.pending' => ['provider' => 'google', 'subject' => 'transport-worker', 'email' => 'social@example.com', 'name' => 'Worker', 'role' => 'mihaniy', 'expires' => time() + 600]])
            ->postJson('/api/auth/social/register', $payload)->assertCreated()
            ->assertJsonPath('user.worker_profile.transport_vehicles', ['triporteur', 'car']);
    }
}
