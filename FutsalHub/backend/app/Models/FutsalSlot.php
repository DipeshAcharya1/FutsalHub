<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FutsalSlot extends Model
{
    use HasFactory;

    protected $table = 'futsal_slots';

    protected $fillable = [
        'futsal_id',
        'slot_id',
        'price',
        'slot_date',
        'is_available',
    ];

    public function futsal()
    {
        return $this->belongsTo(Futsal::class);
    }

    public function timeSlot()
    {
        return $this->belongsTo(TimeSlot::class, 'slot_id');
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class, 'futsal_slot_id');
    }
}
