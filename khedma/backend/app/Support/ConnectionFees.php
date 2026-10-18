<?php

namespace App\Support;

use App\Models\Booking;
use App\Models\BookingFeePayment;
use Illuminate\Support\Str;

class ConnectionFees
{
    public static function quote(mixed $price, int $rate = 1000): array
    {
        $base = (int) round((float) $price * 100);
        $fee = intdiv($base * $rate + 5000, 10000);
        return ['baseCents' => $base, 'feeCents' => $fee, 'clientTotalCents' => $base + $fee, 'workerNetCents' => $base - $fee];
    }

    public static function ready(): bool
    {
        return str_starts_with(config('billing.adapter_url') ?? '', 'https://')
            && strlen(config('billing.adapter_token') ?? '') >= 32
            && strlen(config('billing.webhook_secret') ?? '') >= 32;
    }

    public static function create(Booking $booking): void
    {
        if (! $booking->fee_rate_bps) return;
        $fee = self::quote($booking->price, $booking->fee_rate_bps)['feeCents'];
        foreach (['client' => $booking->client_id, 'worker' => $booking->workerProfile->user_id] as $role => $user) {
            BookingFeePayment::firstOrCreate(['booking_id' => $booking->id, 'user_id' => $user], [
                'role' => $role, 'reference' => (string) Str::uuid(), 'amount_cents' => $fee,
                'status' => $fee === 0 ? 'paid' : 'pending', 'paid_at' => $fee === 0 ? now() : null,
            ]);
        }
    }

    public static function unlocked(Booking $booking): bool
    {
        if (! $booking->fee_rate_bps) return true;
        return BookingFeePayment::where('booking_id', $booking->id)->where('status', 'paid')->count() === 2;
    }

    public static function summary(Booking $booking, int $viewer): array
    {
        $payments = BookingFeePayment::where('booking_id', $booking->id)->get();
        $own = $payments->firstWhere('user_id', $viewer);
        return [
            'required' => (bool) $booking->fee_rate_bps, 'ratePercent' => ($booking->fee_rate_bps ?? 1000) / 100,
            'quote' => $booking->price === null ? null : self::quote($booking->price, $booking->fee_rate_bps ?? 1000),
            'unlocked' => self::unlocked($booking), 'checkoutReady' => self::ready(),
            'clientStatus' => $payments->firstWhere('role', 'client')?->status ?? 'not_due',
            'workerStatus' => $payments->firstWhere('role', 'worker')?->status ?? 'not_due',
            'ownPayment' => $own ? $own->only(['reference', 'amount_cents', 'currency', 'status', 'method', 'checkout_url']) : null,
        ];
    }

    public static function cancel(Booking $booking): void
    {
        BookingFeePayment::where('booking_id', $booking->id)->where('status', 'pending')->update(['status' => 'void', 'checkout_url' => null]);
        BookingFeePayment::where('booking_id', $booking->id)->where('status', 'paid')->where('amount_cents', '>', 0)->update(['status' => 'refund_pending', 'checkout_url' => null]);
    }
}
