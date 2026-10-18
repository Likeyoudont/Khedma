<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    protected $fillable = ['client_id', 'worker_profile_id', 'service_category_id', 'description', 'location', 'status', 'price', 'currency', 'scheduled_at', 'completed_at', 'client_token', 'moving_details', 'cancellation_reason', 'fee_rate_bps'];

    protected function casts(): array
    {
        return ['price' => 'decimal:2', 'scheduled_at' => 'datetime', 'completed_at' => 'datetime', 'moving_details' => 'array', 'fee_rate_bps' => 'integer', 'worker_fee_accepted_at' => 'datetime', 'client_fee_accepted_at' => 'datetime'];
    }

    public function client()
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function workerProfile()
    {
        return $this->belongsTo(WorkerProfile::class);
    }

    public function serviceCategory()
    {
        return $this->belongsTo(ServiceCategory::class);
    }

    public function review()
    {
        return $this->hasOne(Review::class);
    }
}
