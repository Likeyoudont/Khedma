<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingFeePayment;
use App\Models\ServiceCategory;
use App\Models\User;
use App\Support\ConnectionFees;
use Database\Seeders\ServiceCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class ConnectionFeeTest extends TestCase
{
    use RefreshDatabase;

    private function requestJob(string $service = 'plumbing'): array
    {
        config(['billing.enabled' => true, 'billing.adapter_url' => 'https://merchant.example.test/checkout',
            'billing.adapter_token' => str_repeat('a', 32), 'billing.webhook_secret' => str_repeat('b', 32)]);
        Http::fake(['merchant.example.test/*' => Http::response(['checkout_url' => 'https://checkout.example.test/pay'])]);
        $this->seed(ServiceCategorySeeder::class);
        $client = User::factory()->create(['role' => 'ba7it', 'phone' => '+212612345678']);
        $worker = User::factory()->create(['role' => 'mihaniy', 'phone' => '+212698765432']);
        $profile = $worker->workerProfile()->create(['available' => true]);
        $profile->serviceCategories()->attach(ServiceCategory::where('key', $service)->first()->id);
        $payload = ['workerId' => $profile->id, 'service' => $service, 'location' => 'Rabat', 'description' => 'Help with the job'];
        if ($service === 'moving') $payload['moving_details'] = ['pickup' => '12 exact street', 'dropoff' => '44 exact street', 'access' => 'Door code 9981', 'items' => 'Sofa', 'helpers' => 'team'];
        $job = $this->actingAs($client)->postJson('/api/bookings', $payload)->assertCreated()->assertJsonPath('fees.required', true)->json();
        return [$client, $worker, '/api/bookings/'.$job['id']];
    }

    private function agree(User $client, User $worker, string $path, float $price = 200): void
    {
        $this->actingAs($worker)->postJson($path.'/action', ['action' => 'accept', 'price' => $price, 'scheduled_at' => now()->addDay()->toIso8601String(), 'fees_accepted' => true])->assertOk();
        $this->actingAs($client)->postJson($path.'/action', ['action' => 'confirm', 'fees_accepted' => true])->assertOk()->assertJsonPath('fees.unlocked', $price === 0.0);
    }

    private function checkout(User $user, string $path, string $method = 'cashplus'): BookingFeePayment
    {
        $reference = $this->actingAs($user)->postJson($path.'/payments', ['method' => $method])->assertOk()->assertJsonPath('fees.ownPayment.status', 'pending')->json('fees.ownPayment.reference');
        return BookingFeePayment::where('reference', $reference)->firstOrFail();
    }

    private function receipt(BookingFeePayment $payment, string $transaction, array $overrides = [], ?int $timestamp = null, bool $valid = true)
    {
        $body = json_encode(array_merge(['reference' => $payment->reference, 'method' => $payment->method, 'amount_cents' => $payment->amount_cents, 'currency' => 'MAD', 'transaction_id' => $transaction, 'event' => 'paid'], $overrides));
        $timestamp ??= time();
        $signature = $valid ? hash_hmac('sha256', $timestamp.'.'.$body, config('billing.webhook_secret')) : str_repeat('0', 64);
        return $this->call('POST', '/api/billing/receipt', [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json', 'HTTP_X_KHEDMA_TIMESTAMP' => (string) $timestamp, 'HTTP_X_KHEDMA_SIGNATURE' => $signature], $body);
    }

    public function test_both_consents_and_verified_fees_are_required_before_contacts_and_work(): void
    {
        [$client, $worker, $path] = $this->requestJob();
        $offer = ['action' => 'accept', 'price' => 200, 'scheduled_at' => now()->addDay()->toIso8601String()];
        $this->actingAs($worker)->postJson($path.'/action', $offer)->assertUnprocessable()->assertJsonValidationErrors('fees_accepted');
        $this->postJson($path.'/action', $offer + ['fees_accepted' => true])->assertOk()->assertJsonPath('fees.quote.workerNetCents', 18000);
        $this->actingAs($client)->postJson($path.'/action', ['action' => 'confirm'])->assertUnprocessable();
        $this->postJson($path.'/action', ['action' => 'confirm', 'fees_accepted' => true])->assertOk()->assertJsonPath('fees.quote.clientTotalCents', 22000)->assertJsonPath('workerPhone', null);
        $this->assertDatabaseCount('booking_fee_payments', 2);
        $booking = Booking::first();
        $this->assertNotNull($booking->worker_fee_accepted_at);
        $this->assertNotNull($booking->client_fee_accepted_at);
        $workerFee = $this->checkout($worker, $path);
        $this->receipt($workerFee, 'worker-tx')->assertOk();
        $this->actingAs($worker)->postJson($path.'/action', ['action' => 'start'])->assertStatus(409);
        $this->getJson($path)->assertJsonPath('clientPhone', null)->assertJsonPath('fees.ownPayment.reference', $workerFee->reference);
        $clientFee = $this->checkout($client, $path, 'cashplus');
        $this->assertNotSame($workerFee->reference, $clientFee->reference);
        $this->receipt($clientFee, 'client-tx')->assertOk();
        $this->actingAs($client)->getJson($path)->assertJsonPath('fees.unlocked', true)->assertJsonPath('workerPhone', $worker->phone)->assertJsonPath('fees.ownPayment.reference', $clientFee->reference);
        $this->actingAs($worker)->getJson($path)->assertJsonPath('clientPhone', $client->phone);
        $this->postJson($path.'/action', ['action' => 'start'])->assertOk()->assertJsonPath('status', 'in_progress');
        $this->actingAs($client)->postJson($path.'/action', ['action' => 'complete', 'completion_confirmed' => true])->assertOk();
    }

    public function test_card_checkout_is_disabled_and_sends_nothing_to_the_provider(): void
    {
        [$client, $worker, $path] = $this->requestJob();
        $this->agree($client, $worker, $path);
        $this->actingAs($client)->postJson($path.'/payments', ['method' => 'card'])->assertUnprocessable()->assertJsonValidationErrors('method');
        Http::assertNothingSent();
        $this->assertDatabaseMissing('booking_fee_payments', ['method' => 'card']);
    }

    public function test_existing_card_payments_can_still_receive_verified_receipts(): void
    {
        [$client, $worker, $path] = $this->requestJob();
        $this->agree($client, $worker, $path);
        $payment = $this->checkout($client, $path);
        $payment->update(['method' => 'card']);
        $this->receipt($payment->fresh(), 'legacy-card')->assertOk();
        $this->assertSame('paid', $payment->fresh()->status);
    }

    public function test_money_rounding_zero_fees_and_price_precision(): void
    {
        $this->assertSame(['baseCents' => 20005, 'feeCents' => 2001, 'clientTotalCents' => 22006, 'workerNetCents' => 18004], ConnectionFees::quote(200.05));
        [$client, $worker, $path] = $this->requestJob();
        $this->actingAs($worker)->postJson($path.'/action', ['action' => 'accept', 'price' => 200.555, 'scheduled_at' => now()->addDay()->toIso8601String(), 'fees_accepted' => true])->assertUnprocessable();
        $this->agree($client, $worker, $path, 0);
        $this->getJson($path)->assertJsonPath('fees.quote.feeCents', 0)->assertJsonPath('fees.unlocked', true);
        $this->assertDatabaseHas('booking_fee_payments', ['amount_cents' => 0, 'status' => 'paid']);
    }

    public function test_checkout_only_uses_server_amount_and_owner_and_does_not_mark_payment_paid(): void
    {
        [$client, $worker, $path] = $this->requestJob();
        $this->agree($client, $worker, $path);
        $own = $this->actingAs($client)->postJson($path.'/payments', ['method' => 'cashplus', 'amount_cents' => 1, 'status' => 'paid', 'user_id' => $worker->id, 'simulate' => true])->assertOk()->assertJsonPath('fees.ownPayment.amount_cents', 2000)->assertJsonPath('fees.ownPayment.status', 'pending')->assertJsonPath('fees.unlocked', false)->json('fees.ownPayment.reference');
        Http::assertSent(fn ($request) => $request['amount_cents'] === 2000 && $request['reference'] === $own && $request['currency'] === 'MAD');
        $this->assertDatabaseMissing('booking_fee_payments', ['status' => 'paid']);
        $this->actingAs(User::factory()->create())->postJson($path.'/payments', ['method' => 'cashplus'])->assertNotFound();
        $this->postJson('/api/auth/logout')->assertOk();
        $this->postJson($path.'/payments', ['method' => 'cashplus'])->assertUnauthorized();
    }

    public function test_unconfigured_or_failed_checkout_never_unlocks_contacts(): void
    {
        [$client, $worker, $path] = $this->requestJob();
        $this->agree($client, $worker, $path);
        config(['billing.adapter_token' => null]);
        $this->postJson($path.'/payments', ['method' => 'cashplus'])->assertStatus(503);
        Http::assertNothingSent();
        config(['billing.adapter_token' => str_repeat('a', 32)]);
        Http::swap(new \Illuminate\Http\Client\Factory());
        Http::fake(['*' => Http::response(['checkout_url' => 'http://insecure.example.test/pay'])]);
        $this->postJson($path.'/payments', ['method' => 'cashplus'])->assertStatus(503);
        $this->getJson($path)->assertJsonPath('fees.unlocked', false)->assertJsonPath('workerPhone', null);
    }

    public function test_retried_checkout_reuses_reference_method_and_url(): void
    {
        [$client, $worker, $path] = $this->requestJob();
        $this->agree($client, $worker, $path);
        $payment = $this->checkout($client, $path);
        $this->postJson($path.'/payments', ['method' => 'cashplus'])->assertOk()->assertJsonPath('fees.ownPayment.reference', $payment->reference);
        $this->postJson($path.'/payments', ['method' => 'card'])->assertUnprocessable()->assertJsonValidationErrors('method');
        Http::assertSentCount(1);
        $this->assertDatabaseCount('booking_fee_payments', 2);
    }

    public function test_forged_stale_or_mismatched_receipts_are_rejected(): void
    {
        [$client, $worker, $path] = $this->requestJob();
        $this->agree($client, $worker, $path);
        $payment = $this->checkout($client, $path);
        $this->receipt($payment, 'bad-signature', valid: false)->assertForbidden();
        $this->receipt($payment, 'stale', timestamp: time() - 301)->assertForbidden();
        foreach ([['amount_cents' => 1], ['method' => 'card'], ['currency' => 'EUR']] as $change) $this->receipt($payment, 'mismatch', $change)->assertUnprocessable();
        $this->postJson('/api/billing/receipt', ['reference' => $payment->reference])->assertForbidden();
        $this->assertDatabaseCount('fee_payment_receipts', 0);
        $this->assertSame('pending', $payment->fresh()->status);
    }

    public function test_duplicate_receipts_are_idempotent_and_cannot_pay_another_person(): void
    {
        [$client, $worker, $path] = $this->requestJob();
        $this->agree($client, $worker, $path);
        $first = $this->checkout($client, $path);
        $second = $this->checkout($worker, $path);
        $this->receipt($first, 'same-external-tx')->assertOk();
        $this->receipt($first, 'same-external-tx')->assertOk();
        $this->receipt($second, 'same-external-tx')->assertStatus(409);
        $this->assertDatabaseCount('fee_payment_receipts', 1);
        $this->assertSame('pending', $second->fresh()->status);
        $this->getJson($path)->assertJsonPath('fees.unlocked', false);
    }

    public function test_cancellation_keeps_contacts_locked_and_tracks_verified_refunds(): void
    {
        [$client, $worker, $path] = $this->requestJob();
        $this->agree($client, $worker, $path);
        $payment = $this->checkout($client, $path);
        $this->receipt($payment, 'paid-before-cancel')->assertOk();
        $this->actingAs($client)->postJson($path.'/action', ['action' => 'cancel', 'reason' => 'changed_plans'])->assertOk()->assertJsonPath('fees.ownPayment.status', 'refund_pending')->assertJsonPath('workerPhone', null);
        $this->assertDatabaseHas('booking_fee_payments', ['user_id' => $worker->id, 'status' => 'void']);
        $this->receipt($payment, 'paid-before-cancel')->assertOk();
        $this->receipt($payment, 'refund-tx', ['event' => 'refunded'])->assertOk();
        $this->receipt($payment, 'refund-tx', ['event' => 'refunded'])->assertOk();
        $this->getJson($path)->assertJsonPath('fees.ownPayment.status', 'refunded')->assertJsonPath('fees.unlocked', false);
    }

    public function test_late_payment_after_cancellation_or_expiry_requires_refund(): void
    {
        [$client, $worker, $path] = $this->requestJob();
        $this->agree($client, $worker, $path);
        $first = $this->checkout($client, $path);
        $second = $this->checkout($worker, $path);
        $this->actingAs($client)->postJson($path.'/action', ['action' => 'cancel', 'reason' => 'other'])->assertOk();
        $this->receipt($first, 'late-cancel')->assertOk();
        $this->assertSame('refund_pending', $first->fresh()->status);
        $this->receipt($second, 'late-worker')->assertOk();
        $this->getJson($path)->assertJsonPath('fees.unlocked', false);
        $this->assertSame('refund_pending', $second->fresh()->status);
    }

    public function test_expired_confirmed_visit_cannot_be_paid_and_late_receipts_are_not_unlocked(): void
    {
        [$client, $worker, $path] = $this->requestJob();
        $this->agree($client, $worker, $path);
        $payment = $this->checkout($client, $path);
        Booking::first()->update(['scheduled_at' => now()->subMinute()]);
        $this->postJson($path.'/payments', ['method' => 'cashplus'])->assertStatus(409);
        $this->receipt($payment, 'late-expired')->assertOk();
        $this->getJson($path)->assertJsonPath('fees.ownPayment.status', 'refund_pending')->assertJsonPath('fees.unlocked', false);
    }

    public function test_contacts_are_filtered_from_messages_details_activity_and_export_until_paid(): void
    {
        [$client, $worker, $path] = $this->requestJob('moving');
        Booking::first()->update(['description' => 'Call ٠٦١٢٣٤٥٦٧٨ or client@example.com', 'location' => 'Rabat']);
        $this->actingAs($worker)->getJson($path)->assertJsonPath('description', 'Call […] or […]')->assertJsonPath('detailsLocked', true)->assertJsonMissingPath('movingDetails.pickup')->assertJsonPath('movingDetails.items', 'Sofa');
        $this->getJson('/api/auth/export')->assertJsonMissingPath('bookings.0.moving_details.pickup');
        foreach (['Call 06 12 34 56 78', 'Go to https://example.com', 'Email me at client@example.com'] as $body) $this->postJson($path.'/messages', ['body' => $body, 'client_token' => (string) Str::uuid()])->assertUnprocessable();
        $this->postJson($path.'/messages', ['body' => 'My price is 200 DH, tomorrow at 14:00', 'client_token' => (string) Str::uuid()])->assertCreated();
        $this->postJson($path.'/issue', ['reason' => 'other', 'details' => 'Call ٠٦١٢٣٤٥٦٧٨', 'client_token' => (string) Str::uuid()])->assertOk()->assertJsonPath('issues.0.details', 'Call […]');
        $this->actingAs($client)->getJson('/api/auth/activity')->assertJsonPath('items.0.body', '{"reason":"other","details":"Call […]"}');
        $this->getJson($path)->assertJsonPath('movingDetails.pickup', '12 exact street');
        $this->agree($client, $worker, $path);
        $this->receipt($this->checkout($client, $path), 'client-contact')->assertOk();
        $this->receipt($this->checkout($worker, $path), 'worker-contact')->assertOk();
        $this->actingAs($worker)->getJson($path)->assertJsonPath('movingDetails.pickup', '12 exact street')->assertJsonPath('detailsLocked', false);
        $this->postJson($path.'/messages', ['body' => 'Call 0612345678', 'client_token' => (string) Str::uuid()])->assertCreated();
    }

    public function test_public_profiles_cannot_publish_contacts_when_fees_are_enabled(): void
    {
        [$client, $worker, $path] = $this->requestJob();
        $worker->workerProfile->update(['description' => 'Contact +212612345678 or worker@example.test']);
        $this->getJson('/api/workers/'.$worker->workerProfile->id)->assertOk()->assertJsonPath('description', 'Contact […] or […]')->assertJsonMissingPath('phone');
    }

    public function test_launch_check_rejects_enabled_fees_without_merchant_configuration(): void
    {
        $this->seed(ServiceCategorySeeder::class);
        config(['billing.enabled' => true, 'billing.adapter_url' => null]);
        $this->artisan('khedma:launch-check --local')->expectsOutputToContain('FAIL — Connection-fee merchant adapter configured')->assertExitCode(1);
    }
}
