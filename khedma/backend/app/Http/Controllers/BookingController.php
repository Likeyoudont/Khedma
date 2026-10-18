<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingActivity;
use App\Models\ServiceCategory;
use App\Models\WorkerProfile;
use App\Support\ConnectionFees;
use App\Support\ContactPrivacy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class BookingController extends Controller
{
    private function query(Request $request)
    {
        $user = $request->user();

        return Booking::query()->where(function ($query) use ($user) {
            $query->where('client_id', $user->id)
                ->orWhereHas('workerProfile', fn ($worker) => $worker->where('user_id', $user->id));
        });
    }

    private function serialize(Booking $booking): array
    {
        $booking->load(['client', 'workerProfile.user', 'serviceCategory', 'review']);

        $locked = ContactPrivacy::locked($booking);
        $safe = fn ($value) => $locked ? ContactPrivacy::redact($value) : $value;
        return [
            'id' => $booking->id, 'workerId' => $booking->worker_profile_id,
            'workerName' => $safe($booking->workerProfile?->user->name),
            'clientName' => $safe($booking->client->name), 'service' => $booking->serviceCategory->key,
            'location' => $safe($booking->location), 'description' => $safe($booking->description),
            'status' => $booking->status, 'price' => $booking->price,
            'scheduledAt' => $booking->scheduled_at?->toIso8601String(),
            'rating' => $booking->review?->rating, 'comment' => $booking->review?->comment,
            'detailsLocked' => $locked && auth()->id() !== $booking->client_id && (bool) $booking->moving_details,
            'movingDetails' => ContactPrivacy::moving($booking, (int) auth()->id()), 'cancellationReason' => $booking->cancellation_reason,
            'issues' => BookingActivity::where('booking_id', $booking->id)->where('kind', 'issue')->with('sender:id,name')->latest('id')->limit(50)->get()->map(fn ($item) => [
                'id' => $item->id, 'sender' => $safe($item->sender?->name), 'createdAt' => $item->created_at->toIso8601String(),
                ...$safe(json_decode($item->body, true)),
            ]),
            'fees' => ConnectionFees::summary($booking, (int) auth()->id()),
            'workerPhone' => auth()->id() === $booking->client_id && in_array($booking->status, ['confirmed', 'in_progress', 'completed']) && ConnectionFees::unlocked($booking) ? $booking->workerProfile?->user->phone : null,
            'clientPhone' => auth()->id() !== $booking->client_id && in_array($booking->status, ['confirmed', 'in_progress', 'completed']) && ConnectionFees::unlocked($booking) ? $booking->client->phone : null,
        ];
    }

    public function index(Request $request)
    {
        return response()->json($this->query($request)->latest('id')->get()->map(fn ($booking) => $this->serialize($booking)));
    }

    public function show(Request $request, int $id)
    {
        return response()->json($this->serialize($this->query($request)->findOrFail($id)));
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->role === 'ba7it', 403);
        $data = $request->validate([
            'workerId' => ['required', 'integer', 'exists:worker_profiles,id'],
            'service' => ['required', 'string', 'exists:service_categories,key'],
            'location' => ['required', 'string', 'max:160'],
            'description' => ['required', 'string', 'max:1500'],
            'client_token' => ['nullable', 'uuid'],
            'moving_details' => ['nullable', 'array:pickup,dropoff,items,access,vehicle,helpers', Rule::prohibitedIf($request->input('service') !== 'moving')],
            'moving_details.pickup' => ['required_with:moving_details', 'string', 'max:255'],
            'moving_details.dropoff' => ['required_with:moving_details', 'string', 'max:255'],
            'moving_details.items' => ['required_with:moving_details', 'string', 'max:255'],
            'moving_details.access' => ['nullable', 'string', 'max:255'],
            'moving_details.vehicle' => ['nullable', Rule::in(['triporteur', 'bus', 'bike', 'motorcycle', 'car', 'van', 'truck'])],
            'moving_details.helpers' => ['required_with:moving_details', Rule::in(['discuss', 'transport_only', 'one', 'team'])],
        ]);
        [$booking, $created] = DB::transaction(function () use ($request, $data) {
            // Serialize retries from the same account before inserting a booking.
            $request->user()->newQuery()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            if (! empty($data['client_token'])) {
                $previous = Booking::where('client_id', $request->user()->id)->where('client_token', $data['client_token'])->first();
                if ($previous) {
                    abort_unless($previous->worker_profile_id === (int) $data['workerId'] && $previous->serviceCategory->key === $data['service'] && $previous->location === $data['location'] && $previous->description === $data['description'] && $previous->moving_details == ($data['moving_details'] ?? null), 409, 'This request token was already used for different details.');
                    return [$previous, false];
                }
            }
            $worker = WorkerProfile::whereHas('user', fn ($q) => $q->where('role', 'mihaniy'))->lockForUpdate()->findOrFail($data['workerId']);
            abort_unless($worker->available, 422, 'This worker is currently unavailable.');
            $category = ServiceCategory::where('key', $data['service'])->firstOrFail();
            abort_unless($worker->serviceCategories()->where('service_categories.id', $category->id)->exists(), 422, 'This worker does not offer that service.');
            abort_if(! empty($data['moving_details']['vehicle']) && ! in_array($data['moving_details']['vehicle'], $worker->transport_vehicles ?? [], true), 422, 'Choose a vehicle offered by this worker.');
            $booking = Booking::create([
                'client_id' => $request->user()->id, 'worker_profile_id' => $worker->id,
                'service_category_id' => $category->id, 'location' => $data['location'],
                'description' => $data['description'], 'status' => 'pending', 'currency' => 'MAD',
                'client_token' => $data['client_token'] ?? null,
                'moving_details' => $data['moving_details'] ?? null,
                'fee_rate_bps' => config('billing.enabled') ? config('billing.rate_bps') : null,
            ]);
            BookingActivity::record($booking, $request->user()->id, 'requested');
            return [$booking, true];
        });
        return response()->json($this->serialize($booking), $created ? 201 : 200);
    }

    public function action(Request $request, int $id)
    {
        $data = $request->validate(['action' => ['required', Rule::in(['accept', 'confirm', 'start', 'decline', 'cancel', 'complete'])]]);
        $booking = $this->query($request)->findOrFail($id);
        $isClient = $booking->client_id === $request->user()->id;
        $action = $data['action'];
        $values = [];
        if ($action === 'accept') {
            abort_if($isClient, 403);
            abort_unless($booking->status === 'pending' && $booking->price === null, 409, 'This request already has a proposal or is no longer pending.');
            $values = $request->validate(['price' => ['required', 'numeric', 'min:0', 'max:999999.99', 'decimal:0,2'], 'scheduled_at' => ['required', 'date', 'after:now']]);
            if ($booking->fee_rate_bps) $request->validate(['fees_accepted' => ['required', 'accepted']]);
            $values['status'] = 'pending';
            if ($booking->fee_rate_bps) $values['worker_fee_accepted_at'] = now();
        } elseif ($action === 'confirm') {
            abort_unless($isClient, 403);
            abort_unless($booking->status === 'pending' && $booking->price !== null && $booking->scheduled_at !== null, 409);
            abort_unless($booking->scheduled_at->isFuture(), 409, 'The proposed visit time has passed. Cancel this request and arrange a new visit.');
            if ($booking->fee_rate_bps) $request->validate(['fees_accepted' => ['required', 'accepted']]);
            $values['status'] = 'confirmed';
            if ($booking->fee_rate_bps) $values['client_fee_accepted_at'] = now();
        } elseif ($action === 'start') {
            abort_if($isClient, 403);
            abort_unless($booking->status === 'confirmed', 409);
            abort_unless(ConnectionFees::unlocked($booking), 409, 'Both platform fees must be verified before starting work.');
            $values['status'] = 'in_progress';
        } elseif ($action === 'decline') {
            abort_if($isClient, 403);
            abort_unless($booking->status === 'pending', 409);
            $values['status'] = 'cancelled';
        } elseif ($action === 'cancel') {
            abort_unless(in_array($booking->status, ['pending', 'confirmed']), 409, 'Work has already started. Report a problem instead of cancelling.');
            $values['status'] = 'cancelled';
        } else {
            abort_unless($isClient, 403);
            abort_unless($booking->status === 'in_progress', 409, 'The worker must start this job before it can be completed.');
            $request->validate(['completion_confirmed' => ['required', 'accepted']]);
            $values = ['status' => 'completed', 'completed_at' => now()];
        }
        if (in_array($action, ['cancel', 'decline'])) {
            $values['cancellation_reason'] = $request->validate(['reason' => ['required', Rule::in(['changed_plans', 'no_response', 'unavailable', 'no_show', 'other'])]])['reason'];
        }
        // Compare-and-update prevents concurrent actions from overwriting a newer state.
        DB::transaction(function () use ($id, $booking, $values, $request, $action) {
            abort_unless(Booking::whereKey($id)->where('status', $booking->status)->where('price', $booking->price)->update($values), 409, 'This booking changed. Refresh and try again.');
            if ($action === 'confirm') ConnectionFees::create($booking->fresh());
            if (in_array($action, ['cancel', 'decline'])) ConnectionFees::cancel($booking);

            $kind = ['accept' => 'proposed', 'confirm' => 'confirmed', 'start' => 'started', 'decline' => 'cancelled', 'cancel' => 'cancelled', 'complete' => 'completed'][$action];
            BookingActivity::record($booking, $request->user()->id, $kind);
        });

        return response()->json($this->serialize($booking->fresh()));
    }

    public function issue(Request $request, int $id)
    {
        $booking = $this->query($request)->findOrFail($id);
        $data = $request->validate([
            'reason' => ['required', Rule::in(['no_show', 'quality', 'price', 'safety', 'other'])],
            'details' => ['required', 'string', 'max:1500'],
            'client_token' => ['required', 'uuid'],
        ]);
        DB::transaction(function () use ($request, $booking, $data) {
            $booking = Booking::whereKey($booking->id)->lockForUpdate()->firstOrFail();
            $body = json_encode(['reason' => $data['reason'], 'details' => $data['details']]);
            $previous = BookingActivity::where('booking_id', $booking->id)->where('sender_id', $request->user()->id)->where('client_token', $data['client_token'])->first();
            if ($previous) {
                abort_unless($previous->kind === 'issue' && $previous->body === $body, 409);
                return;
            }
            BookingActivity::record($booking, $request->user()->id, 'issue', $body, $data['client_token']);
        });

        return response()->json($this->serialize($booking->fresh()));
    }

    public function review(Request $request, int $id)
    {
        $data = $request->validate(['rating' => ['required', 'integer', 'between:1,5'], 'comment' => ['nullable', 'string', 'max:1500']]);

        return DB::transaction(function () use ($request, $id, $data) {
            $booking = $this->query($request)->lockForUpdate()->findOrFail($id);
            abort_unless($booking->client_id === $request->user()->id, 403);
            abort_unless($booking->status === 'completed', 409);
            // The database also enforces one review per booking.
            abort_if($booking->review()->exists(), 409, 'This booking has already been reviewed.');
            $booking->review()->create($data);
            BookingActivity::record($booking, $request->user()->id, 'reviewed');

            return response()->json($this->serialize($booking), 201);
        });
    }
}
