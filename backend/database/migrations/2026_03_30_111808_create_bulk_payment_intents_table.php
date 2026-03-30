<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bulk_payment_intents', function (Blueprint $table) {
            $table->id();
            $table->string('bulk_booking_id')->unique();
            $table->string('pidx')->nullable();
            $table->unsignedBigInteger('user_id');
            $table->json('slots_data');
            $table->decimal('total_amount', 10, 2);
            $table->integer('total_slots');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            
            $table->index('bulk_booking_id');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bulk_payment_intents');
    }
};