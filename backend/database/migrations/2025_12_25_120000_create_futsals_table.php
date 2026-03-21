<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('futsals', function (Blueprint $table) {
            $table->id(); // futsal_id
            $table->string('futsal_name', 100);
            $table->string('location', 150)->nullable();
            $table->string('contact_number', 20)->nullable();
            $table->text('description')->nullable();
            $table->string('image', 255)->nullable();
            $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('futsals');
    }
};
