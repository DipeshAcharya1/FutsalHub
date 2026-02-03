<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('futsal_slots', function (Blueprint $table) {
            $table->id(); // futsal_slot_id
            $table->foreignId('futsal_id')->constrained('futsals')->cascadeOnDelete();
            $table->foreignId('slot_id')->constrained('time_slots')->cascadeOnDelete();
            $table->decimal('price', 10, 2)->nullable();
            $table->date('slot_date')->nullable();
            $table->boolean('is_available')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('futsal_slots');
    }
};
