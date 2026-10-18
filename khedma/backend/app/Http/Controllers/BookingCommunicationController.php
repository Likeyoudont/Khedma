<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingActivity;
use App\Support\ContactPrivacy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookingCommunicationController extends Controller
{
    private function booking(Request $request, int $id)
    {
        return Booking::where(function ($query) use ($request) {
            $query->where('client_id', $request->user()->id)->orWhereHas('workerProfile', fn ($worker) => $worker->where('user_id', $request->user()->id));
        })->findOrFail($id);
    }

    private function serialize(BookingActivity $activity, int $user): array
    {
        $locked = ContactPrivacy::locked(Booking::findOrFail($activity->booking_id));
        $body = $activity->body;
        if ($locked) $body = $activity->kind === 'issue' ? json_encode(ContactPrivacy::redact(json_decode($body, true)), JSON_UNESCAPED_UNICODE) : ContactPrivacy::redact($body);
        return ['id' => $activity->id, 'bookingId' => $activity->booking_id, 'kind' => $activity->kind,
            'body' => $body, 'sender' => $locked ? ContactPrivacy::redact($activity->sender->name) : $activity->sender->name,
            'mine' => $activity->sender_id === $user, 'unread' => $activity->recipient_id === $user && $activity->read_at === null,
            'createdAt' => $activity->created_at->toIso8601String()];
    }

    public function messages(Request $request, int $id)
    {
        $this->booking($request, $id);
        $request->validate(['before' => ['sometimes', 'integer', 'min:1']]);
        $query = BookingActivity::where('booking_id', $id)->where('kind', 'message');
        if ($request->filled('before')) {
            $query->where('id', '<', $request->integer('before'));
        }
        $messages = $query->with('sender:id,name')->latest('id')->limit(100)->get();

        return response()->json(['messages' => $messages->reverse()->values()->map(fn ($activity) => $this->serialize($activity, $request->user()->id)), 'hasOlder' => $messages->count() === 100]);
    }

    public function send(Request $request, int $id)
    {
        $booking = $this->booking($request, $id);
        $data = $request->validate(['body' => ['required', 'string', 'max:2000'], 'client_token' => ['required', 'uuid']]);

        return DB::transaction(function () use ($request, $booking, $data) {
            $booking = Booking::whereKey($booking->id)->lockForUpdate()->firstOrFail();
            $previous = BookingActivity::where('booking_id', $booking->id)->where('sender_id', $request->user()->id)->where('client_token', $data['client_token'])->first();
            if ($previous) {
                abort_unless($previous->kind === 'message' && $previous->body === $data['body'], 409, 'This token was already used for different details.');
                return response()->json($this->serialize($previous, $request->user()->id));
            }
            abort_if(ContactPrivacy::locked($booking) && ContactPrivacy::redact($data['body']) !== $data['body'], 422, 'Contact details are locked until both fees are verified.');
            abort_unless(in_array($booking->status, ['pending', 'confirmed', 'in_progress']), 409, 'This booking is closed. Its conversation is read-only.');
            $activity = BookingActivity::record($booking, $request->user()->id, 'message', $data['body'], $data['client_token']);
            abort_unless($activity, 409);

            return response()->json($this->serialize($activity, $request->user()->id), 201);
        });
    }

    public function readMessages(Request $request, int $id)
    {
        $this->booking($request, $id);
        $data = $request->validate(['through_id' => ['required', 'integer', 'min:1']]);
        BookingActivity::where('booking_id', $id)->where('kind', 'message')->where('recipient_id', $request->user()->id)
            ->where('id', '<=', $data['through_id'])->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    public function activity(Request $request)
    {
        $query = BookingActivity::where('recipient_id', $request->user()->id);
        $unread = (clone $query)->whereNull('read_at')->count();
        $items = $query->with('sender:id,name')->latest('id')->limit(50)->get();

        return response()->json(['unread' => $unread, 'items' => $items->map(fn ($item) => $this->serialize($item, $request->user()->id))]);
    }

    public function readActivity(Request $request, int $id)
    {
        $activity = BookingActivity::where('recipient_id', $request->user()->id)->findOrFail($id);
        if (! $activity->read_at) {
            $activity->update(['read_at' => now()]);
        }

        return response()->json(['ok' => true]);
    }
}
