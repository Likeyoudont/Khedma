<?php

namespace Tests\Feature;

use App\Models\SocialAccount;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordRecoveryTest extends TestCase
{
    use RefreshDatabase;

    private function enable(): void
    {
        config(['services.password_recovery_enabled' => true, 'mail.default' => 'smtp']);
        Notification::fake();
    }

    public function test_recovery_is_disabled_without_real_mail_transport(): void
    {
        config(['services.password_recovery_enabled' => true, 'mail.default' => 'log']);
        $this->getJson('/api/auth/recovery/options')->assertJson(['email' => false, 'phone' => false]);
        $this->postJson('/api/auth/recovery/send', ['email' => 'someone@example.com'])->assertStatus(503);
    }

    public function test_email_request_is_generic_and_social_accounts_are_not_reset(): void
    {
        $this->enable();
        $user = User::factory()->create(['email' => 'client@example.com']);
        $response = $this->postJson('/api/auth/recovery/send', ['email' => 'CLIENT@example.com'])->assertOk()->json();
        Notification::assertSentTo($user, ResetPassword::class, fn ($notification) => str_starts_with($notification->toMail($user)->actionUrl, 'http://localhost:5173/reset-password?'));
        $this->postJson('/api/auth/recovery/send', ['email' => 'missing@example.com'])->assertExactJson($response);
        SocialAccount::create(['user_id' => $user->id, 'provider' => 'google', 'subject' => 'subject']);
        Notification::fake();
        $this->postJson('/api/auth/recovery/send', ['email' => 'client@example.com'])->assertExactJson($response);
        Notification::assertNothingSent();
    }

    public function test_reset_checks_token_confirmation_and_prevents_reuse(): void
    {
        $this->enable();
        $user = User::factory()->create(['password' => 'old-password']);
        $token = Password::createToken($user);
        $payload = ['email' => $user->email, 'token' => $token, 'password' => 'new-password', 'password_confirmation' => 'new-password'];
        $this->postJson('/api/auth/recovery/reset', array_merge($payload, ['token' => 'invalid']))->assertUnprocessable();
        $this->postJson('/api/auth/recovery/reset', array_merge($payload, ['password_confirmation' => 'mismatch']))->assertUnprocessable();
        $this->assertTrue(Hash::check('old-password', $user->fresh()->password));
        $this->postJson('/api/auth/recovery/reset', $payload)->assertOk();
        $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
        $this->postJson('/api/auth/recovery/reset', $payload)->assertUnprocessable();
        $this->postJson('/api/auth/login', ['identity' => $user->email, 'password' => 'new-password'])->assertOk();
    }

    public function test_expired_tokens_and_social_account_password_resets_are_rejected(): void
    {
        $this->enable();
        $user = User::factory()->create();
        $token = Password::createToken($user);
        $this->travel(61)->minutes();
        $payload = ['email' => $user->email, 'token' => $token, 'password' => 'new-password', 'password_confirmation' => 'new-password'];
        $this->postJson('/api/auth/recovery/reset', $payload)->assertUnprocessable();
        $this->travelBack();
        SocialAccount::create(['user_id' => $user->id, 'provider' => 'apple', 'subject' => 'subject']);
        $this->postJson('/api/auth/recovery/reset', $payload)->assertUnprocessable();
    }

    public function test_requests_are_rate_limited(): void
    {
        $this->enable();
        for ($i = 0; $i < 6; $i++) {
            $this->postJson('/api/auth/recovery/send', ['email' => 'missing@example.com'])->assertOk();
        }
        $this->postJson('/api/auth/recovery/send', ['email' => 'missing@example.com'])->assertStatus(429);
    }

    public function test_reset_revokes_only_the_target_accounts_database_sessions(): void
    {
        $this->enable();
        config(['session.driver' => 'database']);
        $user = User::factory()->create();
        $other = User::factory()->create();
        foreach (['old-user-session' => $user->id, 'other-session' => $other->id] as $id => $account) {
            DB::table('sessions')->insert(['id' => $id, 'user_id' => $account, 'payload' => '', 'last_activity' => time()]);
        }
        $token = Password::createToken($user);
        $this->postJson('/api/auth/recovery/reset', ['email' => $user->email, 'token' => $token, 'password' => 'new-password', 'password_confirmation' => 'new-password'])->assertOk();
        $this->assertDatabaseMissing('sessions', ['id' => 'old-user-session']);
        $this->assertDatabaseHas('sessions', ['id' => 'other-session']);
    }
}
