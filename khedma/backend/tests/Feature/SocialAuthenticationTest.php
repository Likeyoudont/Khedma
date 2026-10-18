<?php

namespace Tests\Feature;

use App\Models\SocialAccount;
use App\Models\User;
use App\Services\SocialIdentity;
use Database\Seeders\ServiceCategorySeeder;
use Firebase\JWT\JWT;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SocialAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    private function flow(string $provider = 'google'): array
    {
        config(['services.frontend_url' => 'http://localhost:5173', 'services.'.$provider => ['client_id' => 'test-client', 'client_secret' => 'test-secret', 'redirect' => 'http://localhost/callback']]);
        $flow = ['provider' => $provider, 'binding' => hash('sha256', 'browser-binding'), 'nonce' => 'test-nonce', 'verifier' => 'test-verifier', 'role' => 'mihaniy'];
        Cache::put('oauth.flow.'.hash('sha256', 'test-state'), $flow, 600);

        return $flow;
    }

    public function test_unconfigured_providers_are_disabled_and_redirect_rejects_unknown_provider(): void
    {
        config(['services.google.client_id' => null, 'services.apple.client_id' => null]);
        $this->getJson('/api/auth/social/options')->assertJson(['google' => false, 'apple' => false]);
        $this->getJson('/api/auth/social/google/redirect')->assertStatus(503);
        $this->getJson('/api/auth/social/unknown/redirect')->assertNotFound();
    }

    public function test_redirect_creates_state_nonce_pkce_and_browser_binding(): void
    {
        $this->flow();
        $response = $this->get('/api/auth/social/google/redirect?role=mihaniy')->assertRedirect()->assertCookie('khedma_oauth');
        parse_str(parse_url($response->headers->get('Location'), PHP_URL_QUERY), $params);
        $this->assertSame('S256', $params['code_challenge_method']);
        $this->assertSame('openid email profile', $params['scope']);
        $flow = Cache::get('oauth.flow.'.hash('sha256', $params['state']));
        $this->assertSame('mihaniy', $flow['role']);
        $this->assertSame($params['nonce'], $flow['nonce']);
    }

    public function test_callback_rejects_wrong_browser_or_state_and_never_authenticates(): void
    {
        $this->flow();
        Http::preventStrayRequests();
        $this->get('/api/auth/social/google/callback?state=test-state&code=test-code')->assertRedirect('http://localhost:5173/login?social_error=expired');
        $this->assertGuest();
        $this->withCookie('khedma_oauth', 'wrong-browser')->get('/api/auth/social/google/callback?state=test-state&code=test-code')->assertRedirect('http://localhost:5173/login?social_error=expired');
    }

    public function test_existing_provider_signs_in_and_matching_email_does_not_link_password_account(): void
    {
        $this->flow();
        $user = User::factory()->create(['email' => 'worker@example.com', 'role' => 'mihaniy']);
        $verified = ['provider' => 'google', 'subject' => 'verified-subject', 'email' => $user->email, 'name' => 'Worker'];
        $this->mock(SocialIdentity::class, fn ($mock) => $mock->shouldReceive('verify')->twice()->andReturn($verified));
        $this->withCookie('khedma_oauth', 'browser-binding')->get('/api/auth/social/google/callback?state=test-state&code=test-code')->assertRedirect('http://localhost:5173/login?social_error=existing');
        $this->assertGuest();
        $this->assertDatabaseCount('social_accounts', 0);
        SocialAccount::create(['user_id' => $user->id, 'provider' => 'google', 'subject' => 'verified-subject']);
        $this->flow();
        $this->get('/api/auth/social/google/callback?state=test-state&code=test-code')->assertRedirect('http://localhost:5173/dashboard');
        $this->assertAuthenticatedAs($user);
        $this->get('/api/auth/social/google/callback?state=test-state&code=test-code')->assertRedirect('http://localhost:5173/login?social_error=expired');
    }

    public function test_new_social_worker_completes_profile_without_password_and_pending_identity_expires(): void
    {
        $this->flow('apple');
        $this->seed(ServiceCategorySeeder::class);
        $verified = ['provider' => 'apple', 'subject' => 'apple-subject', 'email' => 'private@privaterelay.appleid.com', 'name' => ''];
        $this->mock(SocialIdentity::class, fn ($mock) => $mock->shouldReceive('verify')->once()->andReturn($verified));
        $this->withCookie('khedma_oauth', 'browser-binding')->post('/api/auth/social/apple/callback', ['state' => 'test-state', 'code' => 'code'])->assertRedirect('http://localhost:5173/register?social=1');
        $this->getJson('/api/auth/social/pending')->assertOk()->assertJsonPath('role', 'mihaniy');
        $this->postJson('/api/auth/social/register', ['name' => 'Worker', 'city' => 'Rabat', 'role' => 'mihaniy'])->assertUnprocessable();
        $this->postJson('/api/auth/social/register', ['name' => 'Worker', 'city' => 'Rabat', 'role' => 'mihaniy', 'specialties' => ['plumbing'], 'description' => 'Plumber', 'experience_years' => 3, 'service_radius_km' => 20, 'available' => true])->assertCreated()->assertJsonPath('user.worker_profile.service_categories.0.key', 'plumbing')->assertJsonMissingPath('user.password');
        $this->assertDatabaseHas('social_accounts', ['provider' => 'apple', 'subject' => 'apple-subject']);
        $this->postJson('/api/auth/social/register', [])->assertStatus(409);
        $this->withSession(['social.pending' => $verified + ['expires' => time() - 1]])->getJson('/api/auth/social/pending')->assertStatus(409);
    }

    public function test_identity_verification_checks_signature_audience_nonce_and_expiry(): void
    {
        $flow = $this->flow();
        Http::preventStrayRequests();
        $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        openssl_pkey_export($key, $private);
        $details = openssl_pkey_get_details($key);
        $encode = fn ($value) => rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
        $keys = ['keys' => [['kid' => 'test-key', 'kty' => 'RSA', 'alg' => 'RS256', 'n' => $encode($details['rsa']['n']), 'e' => $encode($details['rsa']['e'])]]];
        $claims = ['iss' => 'https://accounts.google.com', 'aud' => 'test-client', 'sub' => 'subject', 'nonce' => 'test-nonce', 'iat' => time(), 'exp' => time() + 300, 'email' => 'test@example.com', 'email_verified' => true];
        $token = '';
        Http::fake(function ($request) use (&$token, $keys) {
            return str_contains($request->url(), '/token')
                ? Http::response(['id_token' => $token]) : Http::response($keys);
        });
        $verify = function (array $claims) use ($private, $flow, &$token) {
            $token = JWT::encode($claims, $private, 'RS256', 'test-key');

            return app(SocialIdentity::class)->verify('google', 'test-code', $flow);
        };
        $this->assertSame('test@example.com', $verify($claims)['email']);
        foreach ([['aud' => 'attacker-client'], ['nonce' => 'wrong-nonce'], ['iss' => 'https://attacker.example'], ['exp' => time() - 20]] as $override) {
            $thrown = false;
            try {
                $verify(array_merge($claims, $override));
            } catch (\RuntimeException|\UnexpectedValueException $error) {
                $thrown = true;
            }
            $this->assertTrue($thrown, 'Invalid claims were accepted.');
        }
        $token = JWT::encode($claims, str_repeat('x', 64), 'HS256', 'test-key');
        $this->expectException(\UnexpectedValueException::class);
        app(SocialIdentity::class)->verify('google', 'test-code', $flow);
    }
}
