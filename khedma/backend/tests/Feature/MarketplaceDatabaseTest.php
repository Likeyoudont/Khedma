<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Review;
use App\Models\ServiceCategory;
use App\Models\User;
use App\Models\WorkerProfile;
use Database\Seeders\ServiceCategorySeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketplaceDatabaseTest extends TestCase
{
    use RefreshDatabase;

    public function test_categories_can_be_seeded_repeatedly_without_duplicates(): void
    {
        $this->seed(ServiceCategorySeeder::class);
        $this->seed(ServiceCategorySeeder::class);
        $this->assertDatabaseCount('service_categories', 18);
        foreach (['metalwork', 'air_conditioning', 'appliances', 'aluminium', 'glass', 'butcher', 'other', 'carpentry', 'locksmith', 'tiling'] as $key) {
            $this->assertDatabaseHas('service_categories', ['key' => $key]);
        }
    }

    public function test_booking_links_client_worker_specialty_and_review(): void
    {
        $this->seed(ServiceCategorySeeder::class);
        $client = User::factory()->create();
        $worker = User::factory()->create(['role' => 'mihaniy']);
        $profile = WorkerProfile::create(['user_id' => $worker->id, 'available' => true]);
        $category = ServiceCategory::where('key', 'plumbing')->firstOrFail();
        $profile->serviceCategories()->attach($category);
        $booking = Booking::create([
            'client_id' => $client->id, 'worker_profile_id' => $profile->id,
            'service_category_id' => $category->id, 'location' => 'Salé',
            'price' => 250, 'status' => 'completed', 'completed_at' => now(),
        ]);
        Review::create(['booking_id' => $booking->id, 'rating' => 5]);
        $this->assertTrue($booking->client->is($client));
        $this->assertTrue($booking->workerProfile->user->is($worker));
        $this->assertSame('250.00', $booking->price);
        $this->assertSame(5, $booking->review->rating);
        $this->assertTrue($category->workers->first()->is($profile));
        $this->expectException(QueryException::class);
        Review::create(['booking_id' => $booking->id, 'rating' => 4]);
    }
}
