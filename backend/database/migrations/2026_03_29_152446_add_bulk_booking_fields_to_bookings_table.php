<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('bookings', function (Blueprint $table) {
            // Add bulk booking fields
            $table->string('bulk_booking_id')->nullable()->after('id');
            $table->boolean('is_bulk_booking')->default(false)->after('bulk_booking_id');
            $table->integer('total_slots')->default(1)->after('is_bulk_booking');
            $table->decimal('total_amount', 10, 2)->nullable()->after('total_slots');
            
            // Add indexes for faster queries
            $table->index('bulk_booking_id');
            $table->index('is_bulk_booking');
        });
    }

    public function down()
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'bulk_booking_id',
                'is_bulk_booking',
                'total_slots',
                'total_amount'
            ]);
        });
    }
};