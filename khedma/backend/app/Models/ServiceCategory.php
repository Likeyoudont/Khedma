<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceCategory extends Model
{
    protected $fillable = ['key', 'icon'];

    public function workers()
    {
        return $this->belongsToMany(WorkerProfile::class);
    }
}
