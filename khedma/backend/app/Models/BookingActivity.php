<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingActivity extends Model
{
    protected $fillable = ['booking_id', 'sender_id', 'recipient_id', 'kind', 'body', 'client_token', 'read_at'];

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public static function record(Booking $booking, int $sender, string $kind, ?string $body = null, ?string $token = null): ?self
    {
        $recipient = $sender === $booking->client_id ? $booking->workerProfile?->user_id : $booking->client_id;
        if (! $recipient) {
            return null;
        }

        $activity = static::create(['booking_id' => $booking->id, 'sender_id' => $sender, 'recipient_id' => $recipient, 'kind' => $kind, 'body' => $body, 'client_token' => $token]);
        if ($kind !== 'message' && config('services.booking_email_enabled') && in_array(config('mail.default'), ['smtp', 'ses', 'postmark', 'resend', 'sendmail'], true)) {
            $user = User::find($recipient);
            if ($user?->email) $user->notify(new \App\Notifications\BookingUpdate($booking->id));
        }
        return $activity;
    }
}
