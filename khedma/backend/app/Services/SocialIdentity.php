<?php

namespace App\Services;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class SocialIdentity
{
    public function verify(string $provider, string $code, array $flow): array
    {
        $config = config('services.'.$provider);
        $tokenUrl = $provider === 'google' ? 'https://oauth2.googleapis.com/token' : 'https://appleid.apple.com/auth/token';
        $payload = [
            'client_id' => $config['client_id'], 'client_secret' => $config['client_secret'],
            'redirect_uri' => $config['redirect'], 'grant_type' => 'authorization_code', 'code' => $code,
        ];
        if ($provider === 'google') {
            $payload['code_verifier'] = $flow['verifier'];
        }
        $tokens = Http::asForm()->timeout(15)->post($tokenUrl, $payload)->throw()->json();
        $keysUrl = $provider === 'google' ? 'https://www.googleapis.com/oauth2/v3/certs' : 'https://appleid.apple.com/auth/keys';
        $keys = Cache::remember('oauth.keys.'.$provider, 3600, fn () => Http::timeout(15)->get($keysUrl)->throw()->json());
        // Firebase validates the signature, allowed algorithm, expiry and not-before.
        $claims = (array) JWT::decode($tokens['id_token'] ?? '', JWK::parseKeySet($keys, 'RS256'));
        $issuers = $provider === 'google' ? ['https://accounts.google.com', 'accounts.google.com'] : ['https://appleid.apple.com'];
        if (! in_array($claims['iss'] ?? '', $issuers, true)
            || ($claims['aud'] ?? '') !== $config['client_id']
            || ! isset($claims['exp']) || ($claims['iat'] ?? 0) > time() + 60
            || ! hash_equals($flow['nonce'], (string) ($claims['nonce'] ?? ''))
            || ! is_string($claims['sub'] ?? null) || $claims['sub'] === '') {
            throw new RuntimeException('Invalid identity token.');
        }
        $emailVerified = in_array($claims['email_verified'] ?? false, [true, 'true'], true);

        return [
            'provider' => $provider, 'subject' => $claims['sub'],
            'email' => $emailVerified && filter_var($claims['email'] ?? '', FILTER_VALIDATE_EMAIL) ? strtolower($claims['email']) : null,
            'name' => is_string($claims['name'] ?? null) ? mb_substr($claims['name'], 0, 255) : '',
        ];
    }
}
