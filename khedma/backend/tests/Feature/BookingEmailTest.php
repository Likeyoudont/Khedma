<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingActivity;
use App\Models\ServiceCategory;
use App\Models\User;
use App\Notifications\BookingUpdate;
use Database\Seeders\ServiceCategorySeeder;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class BookingEmailTest extends TestCase
{
    use RefreshDatabase;

    public function test_booking_alerts_are_gated_and_only_notify_the_other_party(): void
    {
        Notification::fake();
        $this->seed(ServiceCategorySeeder::class);
        $client = User::factory()->create(['role' => 'ba7it']);
        $worker = User::factory()->create(['role' => 'mihaniy']);
        $profile = $worker->workerProfile()->create(['available' => true]);
        $booking = Booking::create(['client_id' => $client->id, 'worker_profile_id' => $profile->id, 'service_category_id' => ServiceCategory::first()->id, 'location' => 'Rabat', 'description' => 'Repair', 'status' => 'pending']);
        config(['services.booking_email_enabled' => true, 'mail.default' => 'log']);
        BookingActivity::record($booking, $client->id, 'requested');
        Notification::assertNothingSent();
        config(['mail.default' => 'smtp']);
        BookingActivity::record($booking, $client->id, 'requested');
        Notification::assertSentTo($worker, BookingUpdate::class, fn ($notification) => $notification instanceof ShouldQueue && $notification->afterCommit === true && $notification->bookingId === $booking->id);
        Notification::assertNotSentTo($client, BookingUpdate::class);
        Notification::fake();
        BookingActivity::record($booking, $client->id, 'message', 'Private message');
        Notification::assertNothingSent();
        $worker->update(['email' => null]);
        BookingActivity::record($booking, $client->id, 'requested');
        Notification::assertNothingSent();
    }

    public function test_email_contains_only_a_sign_in_link_and_no_private_booking_details(): void
    {
        config(['services.frontend_url' => 'https://khedma.test']);
        $message = (new BookingUpdate(42))->toMail(new User);
        $this->assertSame('https://khedma.test/job/42', $message->actionUrl);
        $this->assertStringContainsString('Sign in', implode(' ', $message->introLines));
    }
}
