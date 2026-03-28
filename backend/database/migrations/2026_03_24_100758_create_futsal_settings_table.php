<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('futsal_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('futsal_id')->constrained('futsals')->onDelete('cascade');
            $table->time('open_time')->default('06:00:00');
            $table->time('close_time')->default('22:00:00');
            $table->integer('slot_duration')->default(60);
            $table->integer('break_time')->default(15);
            $table->decimal('default_price', 10, 2)->default(1500);
            $table->timestamps();
            
            $table->unique('futsal_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('futsal_settings');
    }
};