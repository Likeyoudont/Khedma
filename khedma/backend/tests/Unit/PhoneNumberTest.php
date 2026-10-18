<?php

namespace Tests\Unit;

use App\Support\PhoneNumber;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PhoneNumberTest extends TestCase
{
    public function test_local_international_and_arabic_digits_normalize_consistently(): void
    {
        foreach (['06 12 34 56 78', '٠٦١٢٣٤٥٦٧٨', '۰۶۱۲۳۴۵۶۷۸', '+212612345678', '00212612345678', '212612345678', '+212 (0)6 12 34 56 78', '+2120612345678', '00212 06 12 34 56 78', "\u{200F}+212\u{00A0}(0)6 12 34 56 78\u{200E}"] as $number) {
            $this->assertSame('+212612345678', PhoneNumber::normalize($number));
        }
        foreach (['05', '06', '07'] as $prefix) {
            $this->assertSame('+212'.substr($prefix, 1).'12345678', PhoneNumber::normalize($prefix.' 12 34 56 78'));
        }
        $this->assertSame('+33123456789', PhoneNumber::normalize('+33 1 23 45 67 89'));
        $this->assertSame('+33123456789', PhoneNumber::normalize('0033 1 23 45 67 89'));
    }

    public function test_incomplete_or_extra_moroccan_digits_are_rejected(): void
    {
        foreach (['05123456', '06123456', '07123456', '06123456789', '+21200612345678', '+21206123456789', '+21261234567', '002126123456789', '0412345678', '1234567890', '+3312345', 'abc0612345678', '06/12/34/56/78', '06+12345678'] as $number) {
            try {
                PhoneNumber::normalize($number);
                $this->fail('Invalid Moroccan number was accepted: '.$number);
            } catch (ValidationException $exception) {
                $this->assertArrayHasKey('phone', $exception->errors());
            }
        }
    }
}
