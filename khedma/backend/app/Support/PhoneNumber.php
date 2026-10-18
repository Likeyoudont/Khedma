<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

class PhoneNumber
{
    public static function normalize(string $value, string $field = 'phone'): string
    {
        $value = strtr($value, array_combine(
            preg_split('//u', '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', -1, PREG_SPLIT_NO_EMPTY),
            str_split('01234567890123456789')
        ));
        $phone = preg_replace('/[\s().\-\x{061C}\x{200E}\x{200F}\x{202A}-\x{202E}\x{2066}-\x{2069}]/u', '', trim($value));
        if (! preg_match('/^\+?[0-9]+$/', $phone)) {
            throw ValidationException::withMessages([$field => 'Enter a valid phone number.']);
        }
        if (preg_match('/^(?:\+212|00212|212)(0?[5-7][0-9]{8})$/', $phone, $matches)) {
            return '+212'.ltrim($matches[1], '0');
        }
        if (preg_match('/^(?:\+212|00212|212)/', $phone)) {
            throw ValidationException::withMessages([$field => 'A Moroccan phone number requires 10 digits beginning 05, 06 or 07, or +212 followed by 9 digits.']);
        }
        if (preg_match('/^0[5-7][0-9]{8}$/', $phone)) {
            return '+212'.substr($phone, 1);
        }
        if (preg_match('/^(?:\+|00)([1-9][0-9]{7,14})$/', $phone, $matches)) {
            return '+'.$matches[1];
        }
        if (str_starts_with($phone, '0') && ! str_starts_with($phone, '00')) {
            throw ValidationException::withMessages([$field => 'A Moroccan phone number requires 10 digits beginning 05, 06 or 07.']);
        }
        throw ValidationException::withMessages([$field => 'Enter a valid phone number with + or 00 before the international country code.']);
    }
}
