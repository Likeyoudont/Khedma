<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SocialAccount extends Model
{
    protected $fillable = ['user_id', 'provider', 'subject'];

    protected $hidden = ['subject'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
