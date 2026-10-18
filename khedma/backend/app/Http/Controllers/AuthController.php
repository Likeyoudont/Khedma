<?php

namespace App\Http\Controllers;

use App\Models\ServiceCategory;
use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private function identity(Request $request): array
    {
        $request->validate(['identity' => ['required', 'string', 'max:255']]);
        $value = trim($request->input('identity'));
        if (str_contains($value, '@')) {
            return ['email' => strtolower($value)];
        }
        $phone = PhoneNumber::normalize($value, 'identity');

        return ['phone' => $phone];
    }

    public function register(Request $request)
    {
        $request->validate([
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'string', 'max:255'],
        ]);
        $identity = $this->identity($request);
        $request->merge($identity);
        if ($request->filled('phone')) $request->merge(['phone' => PhoneNumber::normalize($request->input('phone'))]);
        if ($request->filled('email')) $request->merge(['email' => strtolower(trim($request->input('email')))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:20', 'unique:users,phone'],
            'password' => ['required', 'string', 'min:8', 'max:128'],
            'role' => ['required', Rule::in(['ba7it', 'mihaniy'])],
            'city' => ['required', 'string', 'max:255'],
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
        $user = DB::transaction(function () use ($data, $identity) {
            $user = new User(['name' => $data['name'], 'password' => $data['password'], 'city' => $data['city']] + array_intersect_key($data, array_flip(['email', 'phone'])));
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

            return $user;
        });
        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(['user' => $user->load('workerProfile.serviceCategories')], 201);
    }

    public function login(Request $request)
    {
        $identity = $this->identity($request);
        $request->validate(['password' => ['required', 'string', 'max:128']]);
        $user = User::where($identity)->first();
        if (! $user || ! Hash::check($request->input('password'), $user->password)) {
            throw ValidationException::withMessages(['identity' => 'These credentials do not match our records.']);
        }
        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(['user' => $user->load('workerProfile.serviceCategories')]);
    }

    public function me(Request $request)
    {
        return response()->json(['user' => $request->user()->load('workerProfile.serviceCategories')]);
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Signed out.']);
    }
}
