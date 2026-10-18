<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\ServiceCategory;
use App\Models\User;
use Database\Seeders\ServiceCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class BookingTest extends TestCase
{
    use RefreshDatabase;

    private function setupBooking(): array
    {
        $this->seed(ServiceCategorySeeder::class);
        $client = User::factory()->create(['role' => 'ba7it']);
        $worker = User::factory()->create(['role' => 'mihaniy', 'phone' => '+212612345678']);
        $profile = $worker->workerProfile()->create(['available' => true]);
        $profile->serviceCategories()->attach(ServiceCategory::where('key', 'plumbing')->first()->id);
        $payload = ['workerId' => $profile->id, 'service' => 'plumbing', 'location' => 'Rabat', 'description' => 'Fix a leaking tap'];
        $this->actingAs($client)->postJson('/api/bookings', $payload)->assertCreated()->assertJsonPath('status', 'pending')->assertJsonPath('workerPhone', null);

        return [$client, $worker, Booking::first(), $payload];
    }

    public function test_booking_lifecycle_and_review_are_persisted(): void
    {
        [$client, $worker, $booking] = $this->setupBooking();
        $path = '/api/bookings/'.$booking->id;
        $this->postJson($path.'/action', ['action' => 'confirm'])->assertStatus(409);
        $this->actingAs($worker)->getJson('/api/bookings')->assertJsonCount(1);
        $this->postJson($path.'/action', ['action' => 'confirm'])->assertForbidden();
        $this->postJson($path.'/action', ['action' => 'accept', 'price' => 150, 'scheduled_at' => now()->subDay()->toIso8601String()])->assertUnprocessable();
        $this->postJson($path.'/action', ['action' => 'accept'])->assertUnprocessable();
        $this->postJson($path.'/action', ['action' => 'accept', 'price' => 150, 'scheduled_at' => now()->addDay()->toIso8601String()])->assertOk()->assertJsonPath('status', 'pending');
        $this->postJson($path.'/action', ['action' => 'accept', 'price' => 900, 'scheduled_at' => now()->addDays(2)->toIso8601String()])->assertStatus(409);
        $this->postJson($path.'/action', ['action' => 'complete'])->assertForbidden();
        $this->actingAs($client)->getJson($path)->assertJsonPath('workerPhone', null);
        $this->postJson($path.'/action', ['action' => 'confirm'])->assertOk()->assertJsonPath('status', 'confirmed')->assertJsonPath('workerPhone', '+212612345678');
        $this->postJson($path.'/review', ['rating' => 5])->assertStatus(409);
        $this->postJson($path.'/action', ['action' => 'complete', 'completion_confirmed' => true])->assertStatus(409);
        $this->actingAs($worker)->postJson($path.'/action', ['action' => 'start'])->assertOk();
        $this->actingAs($client)->postJson($path.'/action', ['action' => 'complete', 'completion_confirmed' => true])->assertOk()->assertJsonPath('status', 'completed');
        $this->postJson($path.'/review', ['rating' => 6])->assertUnprocessable();
        $this->postJson($path.'/review', ['rating' => 5, 'comment' => 'Great work'])->assertCreated();
        $this->postJson($path.'/review', ['rating' => 4])->assertStatus(409);
        $this->postJson($path.'/action', ['action' => 'cancel'])->assertStatus(409);
        $this->assertDatabaseHas('reviews', ['booking_id' => $booking->id, 'rating' => 5]);
        $this->getJson('/api/workers/'.$booking->worker_profile_id)->assertJsonPath('rating', 5)->assertJsonPath('reviewCount', 1);
    }

    public function test_accounts_cannot_access_or_change_other_peoples_bookings(): void
    {
        [$client, $worker, $booking, $payload] = $this->setupBooking();
        $path = '/api/bookings/'.$booking->id;
        $this->actingAs(User::factory()->create())->getJson('/api/bookings')->assertJsonCount(0);
        $this->getJson($path)->assertNotFound();
        $this->postJson($path.'/action', ['action' => 'cancel'])->assertNotFound();
        $this->postJson($path.'/review', ['rating' => 5])->assertNotFound();
        $this->actingAs($client)->postJson($path.'/action', ['action' => 'accept'])->assertForbidden();
        $this->actingAs($worker)->postJson('/api/bookings', $payload)->assertForbidden();
        $this->postJson($path.'/action', ['action' => 'decline', 'reason' => 'unavailable'])->assertOk()->assertJsonPath('status', 'cancelled');
        $this->postJson($path.'/action', ['action' => 'accept', 'price' => 100, 'scheduled_at' => now()->addDay()->toIso8601String()])->assertStatus(409);
    }

    public function test_requests_validate_worker_availability_and_specialties(): void
    {
        [$client, $worker, $booking, $payload] = $this->setupBooking();
        $this->actingAs($client)->postJson('/api/bookings', array_merge($payload, ['service' => 'electricity']))->assertUnprocessable();
        $worker->workerProfile->update(['available' => false]);
        $this->postJson('/api/bookings', $payload)->assertUnprocessable();
        $this->assertDatabaseCount('bookings', 1);
    }

    public function test_messages_are_private_idempotent_and_read_only_after_closure(): void
    {
        [$client, $worker, $booking] = $this->setupBooking();
        $path = '/api/bookings/'.$booking->id.'/messages';
        $payload = ['body' => 'Can you bring the parts?', 'client_token' => (string) Str::uuid()];
        $message = $this->actingAs($client)->postJson($path, $payload)->assertCreated()->json();
        $this->postJson($path, $payload)->assertOk()->assertJsonPath('id', $message['id']);
        $this->postJson($path, array_merge($payload, ['body' => 'Changed retry']))->assertStatus(409);
        $this->getJson($path)->assertJsonCount(1, 'messages');
        $this->actingAs($worker)->getJson('/api/auth/activity')->assertJsonPath('unread', 2);
        $this->getJson($path)->assertJsonPath('messages.0.unread', true);
        $this->postJson($path.'/read', ['through_id' => $message['id']])->assertOk();
        $this->getJson('/api/auth/activity')->assertJsonPath('unread', 1);
        $this->actingAs(User::factory()->create())->getJson($path)->assertNotFound();
        $this->postJson($path, $payload)->assertNotFound();
        $this->postJson($path.'/read', ['through_id' => $message['id']])->assertNotFound();
        $this->postJson('/api/auth/activity/'.$message['id'].'/read', [])->assertNotFound();
        $this->getJson('/api/auth/activity')->assertJsonPath('unread', 0)->assertJsonCount(0, 'items');
        $this->actingAs($client)->postJson('/api/bookings/'.$booking->id.'/action', ['action' => 'cancel', 'reason' => 'changed_plans'])->assertOk();
        $this->getJson($path)->assertJsonCount(1, 'messages');
        $this->postJson($path, ['body' => 'Another message', 'client_token' => (string) Str::uuid()])->assertStatus(409);
        $this->postJson($path, $payload)->assertOk();
    }

    public function test_request_retries_return_the_same_booking_and_reject_changed_details(): void
    {
        [$client, $worker, $booking, $payload] = $this->setupBooking();
        $payload['client_token'] = (string) Str::uuid();
        $response = $this->actingAs($client)->postJson('/api/bookings', $payload)->assertCreated()->json();
        $worker->workerProfile->update(['available' => false]);
        $this->postJson('/api/bookings', $payload)->assertOk()->assertJsonPath('id', $response['id']);
        $this->postJson('/api/bookings', array_merge($payload, ['description' => 'Different request']))->assertStatus(409);
        $this->assertDatabaseCount('bookings', 2);
        $this->assertDatabaseCount('booking_activities', 2);
    }

    public function test_only_assigned_worker_can_start_confirmed_work(): void
    {
        [$client, $worker, $booking] = $this->setupBooking();
        $path = '/api/bookings/'.$booking->id.'/action';
        $this->actingAs($worker)->postJson($path, ['action' => 'start'])->assertStatus(409);
        $this->postJson($path, ['action' => 'accept', 'price' => 200, 'scheduled_at' => now()->addDay()->toIso8601String()])->assertOk();
        $this->actingAs($client)->postJson($path, ['action' => 'confirm'])->assertOk();
        $this->postJson($path, ['action' => 'start'])->assertForbidden();
        $this->actingAs($worker)->postJson($path, ['action' => 'start'])->assertOk()->assertJsonPath('status', 'in_progress');
        $this->postJson($path, ['action' => 'start'])->assertStatus(409);
        $this->actingAs($client)->postJson($path, ['action' => 'complete', 'completion_confirmed' => true])->assertOk();
        $this->assertDatabaseHas('booking_activities', ['booking_id' => $booking->id, 'kind' => 'started', 'recipient_id' => $client->id]);
    }

    public function test_expired_visit_proposals_cannot_be_confirmed(): void
    {
        [$client, $worker, $booking] = $this->setupBooking();
        $booking->update(['price' => 200, 'scheduled_at' => now()->subMinute()]);
        $this->actingAs($client)->postJson('/api/bookings/'.$booking->id.'/action', ['action' => 'confirm'])->assertStatus(409);
        $this->assertSame('pending', $booking->fresh()->status);
    }

    public function test_private_api_responses_are_not_cached_and_auth_errors_are_json(): void
    {
        [$client, $worker, $booking] = $this->setupBooking();
        $response = $this->getJson('/api/bookings/'.$booking->id)->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->postJson('/api/auth/logout')->assertOk();
        $this->get('/api/bookings')->assertUnauthorized()->assertHeader('Content-Type', 'application/json');
    }

    public function test_booking_routes_require_authentication(): void
    {
        $this->getJson('/api/bookings')->assertUnauthorized();
        $this->postJson('/api/bookings', [])->assertUnauthorized();
        $this->postJson('/api/bookings/1/action', ['action' => 'cancel'])->assertUnauthorized();
    }
    public function test_closing_started_work_requires_explicit_completion_and_cancellation_reason(): void
    {
        [$client, $worker, $booking] = $this->setupBooking();
        $path = '/api/bookings/'.$booking->id.'/action';
        $this->postJson($path, ['action' => 'cancel'])->assertUnprocessable();
        $this->postJson($path, ['action' => 'cancel', 'reason' => 'invented'])->assertUnprocessable();
        $this->actingAs($worker)->postJson($path, ['action' => 'accept', 'price' => 200, 'scheduled_at' => now()->addDay()->toIso8601String()])->assertOk();
        $this->actingAs($client)->postJson($path, ['action' => 'confirm'])->assertOk();
        $this->postJson($path, ['action' => 'complete', 'completion_confirmed' => true])->assertStatus(409);
        $this->actingAs($worker)->postJson($path, ['action' => 'start'])->assertOk();
        $this->postJson($path, ['action' => 'cancel', 'reason' => 'other'])->assertStatus(409);
        $this->actingAs($client)->postJson($path, ['action' => 'cancel', 'reason' => 'other'])->assertStatus(409);
        $this->postJson($path, ['action' => 'complete'])->assertUnprocessable();
        $this->postJson($path, ['action' => 'complete', 'completion_confirmed' => false])->assertUnprocessable();
        $this->postJson($path, ['action' => 'complete', 'completion_confirmed' => true])->assertOk()->assertJsonPath('status', 'completed');
    }

    public function test_cancellation_reason_is_saved_and_shown_to_both_participants(): void
    {
        [$client, $worker, $booking] = $this->setupBooking();
        $path = '/api/bookings/'.$booking->id;
        $this->postJson($path.'/action', ['action' => 'cancel', 'reason' => 'no_response'])->assertOk()->assertJsonPath('cancellationReason', 'no_response');
        $this->actingAs($worker)->getJson($path)->assertJsonPath('cancellationReason', 'no_response');
        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'cancellation_reason' => 'no_response']);
    }

    public function test_problem_notes_are_private_shared_and_retry_safe_even_after_closure(): void
    {
        [$client, $worker, $booking] = $this->setupBooking();
        $path = '/api/bookings/'.$booking->id;
        $payload = ['reason' => 'no_show', 'details' => 'Nobody arrived at the agreed time.', 'client_token' => (string) Str::uuid()];
        $this->postJson($path.'/issue', $payload)->assertOk()->assertJsonCount(1, 'issues')->assertJsonPath('issues.0.details', $payload['details']);
        $this->postJson($path.'/issue', $payload)->assertOk()->assertJsonCount(1, 'issues');
        $this->postJson($path.'/issue', array_merge($payload, ['details' => 'Changed note']))->assertStatus(409);
        $this->actingAs($worker)->getJson($path)->assertJsonPath('issues.0.reason', 'no_show');
        $this->getJson('/api/auth/activity')->assertJsonPath('items.0.kind', 'issue');
        $this->actingAs(User::factory()->create())->getJson($path)->assertNotFound();
        $this->postJson($path.'/issue', $payload)->assertNotFound();
        $this->actingAs($client)->postJson($path.'/action', ['action' => 'cancel', 'reason' => 'no_show'])->assertOk();
        $this->postJson($path.'/issue', $payload)->assertOk()->assertJsonCount(1, 'issues');
        $this->postJson($path.'/issue', $payload)->assertStatus(429);
        $this->travel(61)->seconds();
        $this->postJson($path.'/issue', array_merge($payload, ['client_token' => (string) Str::uuid(), 'reason' => 'invented']))->assertUnprocessable();
        $this->assertDatabaseCount('booking_activities', 3);
    }

    public function test_moving_details_are_validated_saved_and_included_in_retry_identity(): void
    {
        [$client, $worker, $booking, $payload] = $this->setupBooking();
        $worker->workerProfile->serviceCategories()->attach(ServiceCategory::where('key', 'moving')->first()->id);
        $worker->workerProfile->update(['transport_vehicles' => ['van']]);
        $payload = array_merge($payload, ['service' => 'moving', 'client_token' => (string) Str::uuid(), 'moving_details' => ['pickup' => 'Agdal', 'dropoff' => 'Hassan', 'items' => 'Sofa', 'vehicle' => 'van', 'helpers' => 'team']]);
        $job = $this->postJson('/api/bookings', $payload)->assertCreated()->assertJsonPath('movingDetails.helpers', 'team')->json();
        $this->postJson('/api/bookings', $payload)->assertOk()->assertJsonPath('id', $job['id']);
        $changed = $payload; $changed['moving_details']['helpers'] = 'one';
        $this->postJson('/api/bookings', $changed)->assertStatus(409);
        $payload['client_token'] = (string) Str::uuid();
        $payload['moving_details']['vehicle'] = 'bike';
        $this->postJson('/api/bookings', $payload)->assertUnprocessable();
        $payload['moving_details']['vehicle'] = 'van';
        unset($payload['moving_details']['pickup']);
        $this->postJson('/api/bookings', $payload)->assertUnprocessable();
        $payload['service'] = 'plumbing';
        $this->postJson('/api/bookings', $payload)->assertUnprocessable();
        $this->actingAs($worker)->getJson('/api/bookings/'.$job['id'])->assertJsonPath('movingDetails.items', 'Sofa');
        $this->assertDatabaseCount('bookings', 2);
    }

    public function test_problem_note_tokens_cannot_be_reused_for_messages(): void
    {
        [$client, $worker, $booking] = $this->setupBooking();
        $path = '/api/bookings/'.$booking->id;
        $token = (string) Str::uuid();
        $this->postJson($path.'/issue', ['reason' => 'price', 'details' => 'Question about parts.', 'client_token' => $token])->assertOk();
        $this->postJson($path.'/messages', ['body' => 'Different operation', 'client_token' => $token])->assertStatus(409);
        $this->getJson($path.'/messages')->assertJsonCount(0, 'messages');
    }

}
