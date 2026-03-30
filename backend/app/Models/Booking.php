<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'futsal_slot_id',
        'booking_date',
        'status',
        'payment_status',
        'refund_amount',
        'refunded_at',
        'payment_method',
        'transaction_id',
        'booking_reference',
        'bulk_booking_id',      
        'is_bulk_booking',      
        'total_slots',          
        'total_amount',         
        'discount_amount',      
        'discount_percentage'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function futsalSlot()
    {
        return $this->belongsTo(FutsalSlot::class, 'futsal_slot_id');
    }

    public function payment()
    {
        return $this->hasOne(Payment::class, 'booking_id');
    }
}
