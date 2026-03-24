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
        'contact_number',
        'description',
        'image',
        'manager_id',
        'active',
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
