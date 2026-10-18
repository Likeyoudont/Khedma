<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingActivity;
use App\Models\ServiceCategory;
use App\Models\SocialAccount;
use App\Support\PhoneNumber;
use App\Support\ContactPrivacy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function settings(Request $request)
    {
        $providers = SocialAccount::where('user_id', $request->user()->id)->pluck('provider')->unique()->values();

        return response()->json(['providers' => $providers, 'password_available' => $providers->isEmpty()]);
    }

    public function export(Request $request)
    {
        $user = $request->user()->load('workerProfile.serviceCategories');
        $bookings = Booking::where(function ($query) use ($user) {
            $query->where('client_id', $user->id)->orWhereHas('workerProfile', fn ($worker) => $worker->where('user_id', $user->id));
        })->with(['serviceCategory', 'review'])->get()->map(fn ($booking) => [
            'id' => $booking->id, 'service' => $booking->serviceCategory->key,
            'description' => ContactPrivacy::locked($booking) ? ContactPrivacy::redact($booking->description) : $booking->description, 'location' => ContactPrivacy::locked($booking) ? ContactPrivacy::redact($booking->location) : $booking->location,
            'status' => $booking->status, 'price' => $booking->price, 'currency' => $booking->currency,
            'scheduled_at' => $booking->scheduled_at, 'completed_at' => $booking->completed_at,
            'moving_details' => ContactPrivacy::moving($booking, $user->id), 'cancellation_reason' => $booking->cancellation_reason,
            'problem_notes' => BookingActivity::where('booking_id', $booking->id)->where('kind', 'issue')->with('sender:id,name')->get()->map(fn ($item) => [
                'sender' => ContactPrivacy::locked($booking) ? ContactPrivacy::redact($item->sender?->name) : $item->sender?->name, 'created_at' => $item->created_at,
                ...(ContactPrivacy::locked($booking) ? ContactPrivacy::redact(json_decode($item->body, true)) : json_decode($item->body, true)),
            ]),
            'review' => $booking->review ? $booking->review->only(['rating', 'comment']) : null,
        ]);

        return response()->json([
            'exported_at' => now()->toIso8601String(),
            'account' => $user->only(['name', 'email', 'phone', 'city', 'role', 'created_at']),
            'worker_profile' => $user->workerProfile ? $user->workerProfile->only(['description', 'experience_years', 'service_radius_km', 'available', 'other_work', 'transport_vehicles', 'latitude', 'longitude']) + ['specialties' => $user->workerProfile->serviceCategories->pluck('key')] : null,
            'bookings' => $bookings,
        ])->header('Content-Disposition', 'attachment; filename="khedma-account.json"')->header('Cache-Control', 'no-store');
    }

    public function update(Request $request)
    {
        $user = $request->user();
        $request->validate(['phone' => ['nullable', 'string', 'max:40']]);
        if ($request->exists('phone')) {
            $phone = $request->input('phone');
            $request->merge(['phone' => $phone ? PhoneNumber::normalize($phone) : null]);
        }
        $worker = $user->role === 'mihaniy';
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20', Rule::unique('users', 'phone')->ignore($user->id)],
            'current_password' => ['nullable', 'string', 'max:128'],
            'role' => ['prohibited'], 'user_id' => ['prohibited'], 'email' => ['prohibited'], 'password' => ['prohibited'],
            'description' => [$worker ? 'required' : 'prohibited', 'string', 'max:5000'],
            'experience_years' => [$worker ? 'required' : 'prohibited', 'integer', 'min:0', 'max:80'],
            'service_radius_km' => [$worker ? 'required' : 'prohibited', 'numeric', 'min:0.5', 'max:500'],
            'available' => [$worker ? 'required' : 'prohibited', 'boolean'],
            'specialties' => [$worker ? 'required' : 'prohibited', 'array', 'min:1'],
            'specialties.*' => ['string', 'distinct', 'exists:service_categories,key'],
            'other_work' => [$worker ? 'nullable' : 'prohibited', Rule::requiredIf(in_array('other', (array) $request->input('specialties', []))), 'string', 'max:255'],
            'transport_vehicles' => [$worker ? 'sometimes' : 'prohibited', 'array', 'max:7'],
            'transport_vehicles.*' => ['string', 'distinct', Rule::in(['triporteur', 'bus', 'bike', 'motorcycle', 'car', 'van', 'truck'])],
            'latitude' => [$worker ? 'nullable' : 'prohibited', 'numeric', 'between:-85,85', 'required_with:longitude'],
            'longitude' => [$worker ? 'nullable' : 'prohibited', 'numeric', 'between:-180,180', 'required_with:latitude'],
        ]);
        if ($worker) $data['other_work'] = in_array('other', $data['specialties']) ? $data['other_work'] : null;
        if ($worker) $data['transport_vehicles'] = in_array('moving', $data['specialties']) ? ($data['transport_vehicles'] ?? []) : [];
        $hasSocial = SocialAccount::where('user_id', $user->id)->exists();
        if (array_key_exists('phone', $data) && $data['phone'] !== $user->phone) {
            if (! $hasSocial && ! Hash::check($data['current_password'] ?? '', $user->password)) {
                throw ValidationException::withMessages(['current_password' => 'Enter your current password to change your phone number.']);
            }
            if (! $data['phone'] && ! $user->email && ! $hasSocial) {
                throw ValidationException::withMessages(['phone' => 'Keep a phone number so you can sign in.']);
            }
        }
        DB::transaction(function () use ($user, $data, $worker) {
            $user->fill(array_intersect_key($data, array_flip(['name', 'city', 'phone'])))->save();
            if ($worker) {
                $profile = $user->workerProfile()->updateOrCreate([], array_intersect_key($data, array_flip(['description', 'experience_years', 'service_radius_km', 'available', 'other_work', 'transport_vehicles', 'latitude', 'longitude'])));
                $profile->serviceCategories()->sync(ServiceCategory::whereIn('key', $data['specialties'])->pluck('id'));
            }
        });

        return response()->json(['user' => $user->fresh()->load('workerProfile.serviceCategories')]);
    }

    public function password(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'string', 'max:128'],
            'password' => ['required', 'string', 'min:8', 'max:128', 'confirmed'],
        ]);
        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => 'The current password is incorrect.']);
        }
        $user->password = $data['password'];
        DB::transaction(function () use ($user, $request) {
            $user->setRememberToken(\Illuminate\Support\Str::random(60));
            $user->save();
            if (config('session.driver') === 'database') {
                DB::table(config('session.table', 'sessions'))->where('user_id', $user->id)
                    ->where('id', '!=', $request->session()->getId())->delete();
            }
        });
        $request->session()->regenerate(true);

        return response()->json(['user' => $user->load('workerProfile.serviceCategories')]);
    }
}
