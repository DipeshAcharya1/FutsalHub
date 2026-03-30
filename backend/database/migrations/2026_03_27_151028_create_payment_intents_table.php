<?php
// database/migrations/2024_03_27_create_payment_intents_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_intents', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_id')->unique();
            $table->string('pidx')->nullable();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('slot_id');
            $table->unsignedBigInteger('futsal_id');
            $table->decimal('amount', 10, 2);
            $table->date('booking_date');
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index('transaction_id');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_intents');
    }
};