<?php

namespace App\Http\Controllers;

use App\Models\WorkerProfile;
use App\Support\ContactPrivacy;

class WorkerController extends Controller
{
    private function query()
    {
        return WorkerProfile::query()->whereHas('user', fn ($query) => $query->where('role', 'mihaniy'))
            ->with(['user:id,name,city', 'serviceCategories', 'bookings' => fn ($query) => $query
                ->where('status', 'completed')->whereHas('review')->with(['review', 'client:id,name'])]);
    }

    private function serialize(WorkerProfile $worker): array
    {
        $reviews = $worker->bookings->map(fn ($booking) => [
            'id' => $booking->review->id,
            'author' => $booking->client->name,
            'rating' => $booking->review->rating,
            'comment' => $booking->review->comment,
        ])->values();

        $safe = fn ($value) => config('billing.enabled') ? ContactPrivacy::redact($value) : $value;
        return [
            'id' => $worker->id,
            'name' => $safe($worker->user->name),
            'location' => $safe($worker->user->city ?? ''),
            'specialties' => $worker->serviceCategories->pluck('key')->values(),
            'experience' => (int) $worker->experience_years,
            'otherWork' => $safe($worker->serviceCategories->contains('key', 'other') ? $worker->other_work : null),
            'transportVehicles' => $worker->serviceCategories->contains('key', 'moving') ? ($worker->transport_vehicles ?? []) : [],
            'serviceRadiusKm' => (float) $worker->service_radius_km,
            'available' => $worker->available,
            'connectionFeePercent' => config('billing.enabled') ? config('billing.rate_bps') / 100 : 0,
            'description' => $safe($worker->description ?? ''),
            'rating' => $reviews->isEmpty() ? null : round($reviews->avg('rating'), 1),
            'reviewCount' => $reviews->count(),
            'reviews' => $safe($reviews->all()),
        ];
    }

    public function index()
    {
        return response()->json($this->query()->orderBy('id')->get()->map(fn ($worker) => $this->serialize($worker)));
    }

    public function show(int $id)
    {
        return response()->json($this->serialize($this->query()->findOrFail($id)));
    }
}
