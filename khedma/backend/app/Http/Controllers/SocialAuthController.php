<?php

namespace App\Http\Controllers;

use App\Models\ServiceCategory;
use App\Models\SocialAccount;
use App\Models\User;
use App\Services\SocialIdentity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class SocialAuthController extends Controller
{
    private function ready(string $provider): bool
    {
        return (bool) (config('services.'.$provider.'.client_id') && config('services.'.$provider.'.client_secret') && config('services.'.$provider.'.redirect'));
    }

    private function frontend(string $path)
    {
        return redirect(rtrim(config('services.frontend_url'), '/').$path);
    }

    public function options()
    {
        return response()->json(['google' => $this->ready('google'), 'apple' => $this->ready('apple')]);
    }

    public function redirect(Request $request, string $provider)
    {
        abort_unless($this->ready($provider), 503, 'This sign-in provider is not configured yet.');
        $data = $request->validate(['role' => ['sometimes', Rule::in(['ba7it', 'mihaniy'])]]);
        $state = Str::random(64);
        $binding = Str::random(64);
        $flow = ['provider' => $provider, 'binding' => hash('sha256', $binding), 'nonce' => Str::random(64), 'verifier' => Str::random(64), 'role' => $data['role'] ?? 'ba7it'];
        Cache::put('oauth.flow.'.hash('sha256', $state), $flow, 600);
        $params = [
            'client_id' => config('services.'.$provider.'.client_id'), 'redirect_uri' => config('services.'.$provider.'.redirect'),
            'response_type' => 'code', 'scope' => $provider === 'google' ? 'openid email profile' : 'name email',
            'state' => $state, 'nonce' => $flow['nonce'],
        ];
        if ($provider === 'google') {
            $params += ['code_challenge' => rtrim(strtr(base64_encode(hash('sha256', $flow['verifier'], true)), '+/', '-_'), '='), 'code_challenge_method' => 'S256'];
        } else {
            $params['response_mode'] = 'form_post';
        }
        $url = $provider === 'google' ? 'https://accounts.google.com/o/oauth2/v2/auth' : 'https://appleid.apple.com/auth/authorize';

        // Apple posts cross-site: a separate encrypted, secure binding cookie survives that callback.
        return redirect()->away($url.'?'.http_build_query($params))->withCookie(cookie('khedma_oauth', $binding, 10, '/api/auth/social', null, $provider === 'apple' || $request->isSecure(), true, false, $provider === 'apple' ? 'none' : 'lax'));
    }

    public function callback(Request $request, string $provider, SocialIdentity $identity)
    {
        $state = $request->input('state');
        $key = 'oauth.flow.'.hash('sha256', is_string($state) ? $state : '');
        $flow = Cache::get($key);
        $binding = $request->cookie('khedma_oauth');
        if (! $flow || $flow['provider'] !== $provider || ! is_string($binding) || ! hash_equals($flow['binding'], hash('sha256', $binding))) {
            return $this->frontend('/login?social_error=expired');
        }
        Cache::forget($key);
        if ($request->input('error') || ! is_string($request->input('code'))) {
            return $this->frontend('/login?social_error=cancelled');
        }
        try {
            $verified = $identity->verify($provider, $request->input('code'), $flow);
            $account = SocialAccount::where('provider', $provider)->where('subject', $verified['subject'])->first();
            if ($account) {
                Auth::login($account->user);
                $request->session()->regenerate();
                $request->session()->forget('social.pending');

                return $this->frontend('/dashboard');
            }
            // Never attach a provider to an existing password account based only on matching email.
            if ($verified['email'] && User::where('email', $verified['email'])->exists()) {
                return $this->frontend('/login?social_error=existing');
            }
            $request->session()->regenerate();
            $request->session()->put('social.pending', $verified + ['role' => $flow['role'], 'expires' => time() + 600]);

            return $this->frontend('/register?social=1');
        } catch (Throwable $error) {
            // Do not log codes, provider tokens, keys or token exchange responses.
            return $this->frontend('/login?social_error=failed');
        }
    }

    public function pending(Request $request)
    {
        $pending = $request->session()->get('social.pending');
        abort_unless($pending && $pending['expires'] >= time(), 409, 'Sign in again to complete your account.');

        return response()->json(['name' => $pending['name'], 'email' => $pending['email'], 'role' => $pending['role']]);
    }

    public function register(Request $request)
    {
        $pending = $request->session()->get('social.pending');
        abort_unless($pending && $pending['expires'] >= time(), 409, 'Sign in again to complete your account.');
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'], 'city' => ['required', 'string', 'max:255'],
            'role' => ['required', Rule::in(['ba7it', 'mihaniy'])],
            'experience_years' => ['required_if:role,mihaniy', 'integer', 'min:0', 'max:80'],
            'service_radius_km' => ['required_if:role,mihaniy', 'numeric', 'min:0.5', 'max:500'],
            'description' => ['required_if:role,mihaniy', 'string', 'max:5000'],
            'available' => ['sometimes', 'boolean'],
            'specialties' => ['required_if:role,mihaniy', 'array', 'min:1'],
            'specialties.*' => ['string', 'distinct', 'exists:service_categories,key'],
            'other_work' => ['nullable', Rule::requiredIf(in_array('other', (array) $request->input('specialties', []))), 'string', 'max:255'],
            'transport_vehicles' => ['sometimes', 'array', 'max:7'],
            'transport_vehicles.*' => ['string', 'distinct', Rule::in(['triporteur', 'bus', 'bike', 'motorcycle', 'car', 'van', 'truck'])],
            'latitude' => ['nullable', 'numeric', 'between:-85,85', 'required_with:longitude'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitude'],
        ]);
        $user = DB::transaction(function () use ($data, $pending) {
            abort_if(SocialAccount::where('provider', $pending['provider'])->where('subject', $pending['subject'])->exists(), 409);
            abort_if($pending['email'] && User::where('email', $pending['email'])->exists(), 409);
            $user = new User(['name' => $data['name'], 'city' => $data['city'], 'email' => $pending['email'], 'password' => Str::random(64)]);
            $user->role = $data['role'];
            $user->save();
            if ($user->role === 'mihaniy') {
                $profile = $user->workerProfile()->create([
                    'description' => $data['description'], 'experience_years' => $data['experience_years'],
                    'service_radius_km' => $data['service_radius_km'], 'available' => $data['available'] ?? false,
                    'other_work' => in_array('other', $data['specialties']) ? $data['other_work'] : null,
                    'transport_vehicles' => in_array('moving', $data['specialties']) ? ($data['transport_vehicles'] ?? []) : [],
                    'latitude' => $data['latitude'] ?? null, 'longitude' => $data['longitude'] ?? null,
                ]);
                $profile->serviceCategories()->sync(ServiceCategory::whereIn('key', $data['specialties'])->pluck('id'));
            }
            SocialAccount::create(['user_id' => $user->id, 'provider' => $pending['provider'], 'subject' => $pending['subject']]);

            return $user;
        });
        Auth::login($user);
        $request->session()->forget('social.pending');
        $request->session()->regenerate();

        return response()->json(['user' => $user->load('workerProfile.serviceCategories')], 201);
    }
}
