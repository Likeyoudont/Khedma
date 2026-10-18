<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingFeePayment extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['amount_cents' => 'integer', 'paid_at' => 'datetime', 'refunded_at' => 'datetime'];
    }
}
