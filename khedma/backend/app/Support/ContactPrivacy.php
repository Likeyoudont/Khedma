<?php

namespace App\Support;

use App\Models\Booking;

class ContactPrivacy
{
    // Common contact formats only; natural-language obfuscation needs moderation.
    public static function redact(mixed $value): mixed
    {
        if (is_array($value)) return array_map(fn ($item) => self::redact($item), $value);
        if (! is_string($value)) return $value;
        return preg_replace_callback('/[\p{L}\d._%+-]+@[\p{L}\d.-]+\.[\p{L}]{2,}|(?:https?:\/\/|www\.)[^\s"<>]+|(?<![\p{L}\d])(?:\+|[0٠۰]|212)[\d\s().-]{7,24}\d(?![\p{L}\d])/u', function ($match) {
            if (str_contains($match[0], '@') || preg_match('/^(https?:\/\/|www\.)/', $match[0])) return '[…]';
            preg_match_all('/\d/u', $match[0], $digits);
            return count($digits[0]) >= 9 && count($digits[0]) <= 15 ? '[…]' : $match[0];
        }, $value);
    }

    public static function locked(Booking $booking): bool
    {
        return $booking->fee_rate_bps && ! ConnectionFees::unlocked($booking);
    }

    public static function moving(Booking $booking, int $viewer): ?array
    {
        $details = $booking->moving_details;
        if ($details && $viewer !== $booking->client_id && self::locked($booking)) {
            $details = self::redact($details);
            foreach (['pickup', 'dropoff', 'access'] as $key) unset($details[$key]);
        }
        return $details;
    }
}
