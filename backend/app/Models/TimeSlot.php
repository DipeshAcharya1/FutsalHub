<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TimeSlot extends Model
{
    use HasFactory;

    protected $table = 'time_slots';

    protected $fillable = [
        'start_time',
        'end_time',
    ];

    public function futsalSlots()
    {
        return $this->hasMany(FutsalSlot::class, 'slot_id');
    }
}
