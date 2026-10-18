<?php

namespace Tests\Feature;

use App\Models\ServiceCategory;
use App\Models\User;
use App\Models\WorkerProfile;
use Database\Seeders\ServiceCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkerDirectoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_directory_shows_registered_workers_without_private_account_fields(): void
    {
        $this->seed(ServiceCategorySeeder::class);
        $user = User::factory()->create(['role' => 'mihaniy', 'city' => 'Salé']);
        $profile = WorkerProfile::create(['user_id' => $user->id, 'available' => true, 'description' => 'Plumber']);
        $profile->serviceCategories()->attach(ServiceCategory::where('key', 'plumbing')->firstOrFail());
        $client = User::factory()->create(['role' => 'ba7it']);
        $hidden = WorkerProfile::create(['user_id' => $client->id]);

        $response = $this->getJson('/api/workers')->assertOk()->assertJsonCount(1)
            ->assertJsonPath('0.id', $profile->id)->assertJsonPath('0.location', 'Salé')
            ->assertJsonPath('0.specialties.0', 'plumbing')->assertJsonPath('0.rating', null);
        $this->assertArrayNotHasKey('email', $response->json('0'));
        $this->assertArrayNotHasKey('phone', $response->json('0'));
        $this->assertArrayNotHasKey('password', $response->json('0'));
        $this->getJson('/api/workers/'.$profile->id)->assertOk()->assertJsonPath('description', 'Plumber');
        $this->getJson('/api/workers/'.$hidden->id)->assertNotFound();
        $this->getJson('/api/workers/99999')->assertNotFound();
    }

    public function test_empty_directory_returns_an_empty_list(): void
    {
        $this->getJson('/api/workers')->assertOk()->assertExactJson([]);
    }
}
