<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    protected $fillable = [
        'user_id', 'futsal_id', 'rating', 'comment', 'title', 
        'images', 'is_verified_purchase', 'is_approved'
    ];

    protected $casts = [
        'images' => 'array',
        'is_verified_purchase' => 'boolean',
        'is_approved' => 'boolean'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function futsal()
    {
        return $this->belongsTo(Futsal::class);
    }
}