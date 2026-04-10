<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Futsal extends Model
{
    use HasFactory;

    protected $fillable = [
        'futsal_name',
        'location',
        'latitude',
        'longitude',
        'average_rating',
        'total_reviews',
        'contact_number',
        'description',
        'image',
        'manager_id',
        'active',
        'restricted_users'
    ];

    protected $casts = [
        'restricted_users' => 'array',  // This will automatically decode JSON to array
        'active' => 'boolean',
    ];

    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function futsalSlots()
    {
        return $this->hasMany(FutsalSlot::class);
    }

    public function bookings()
    {
        return $this->hasManyThrough(Booking::class, FutsalSlot::class, 'futsal_id', 'futsal_slot_id', 'id', 'id');
    }
}
