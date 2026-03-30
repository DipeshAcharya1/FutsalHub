<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('futsals', function (Blueprint $table) {
            // Add restricted_users column to store JSON array of user IDs who are restricted from booking
            $table->json('restricted_users')->nullable()->after('active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('futsals', function (Blueprint $table) {
            $table->dropColumn('restricted_users');
        });
    }
};