<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkerProfile extends Model
{
    protected $fillable = ['user_id', 'description', 'experience_years', 'service_radius_km', 'available', 'photo_path', 'other_work', 'transport_vehicles', 'latitude', 'longitude'];

    protected function casts(): array
    {
        return ['service_radius_km' => 'float', 'available' => 'boolean', 'transport_vehicles' => 'array', 'latitude' => 'float', 'longitude' => 'float'];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function serviceCategories()
    {
        return $this->belongsToMany(ServiceCategory::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }
}
