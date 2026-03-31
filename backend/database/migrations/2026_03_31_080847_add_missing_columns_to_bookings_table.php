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
        Schema::table('bookings', function (Blueprint $table) {
            // Add booking_reference column if it doesn't exist
            if (!Schema::hasColumn('bookings', 'booking_reference')) {
                $table->string('booking_reference', 100)->nullable()->after('id');
            }
            
            // Add payment_method column if it doesn't exist
            if (!Schema::hasColumn('bookings', 'payment_method')) {
                $table->string('payment_method', 50)->nullable()->after('payment_status');
            }
            
            // Add transaction_id column if it doesn't exist
            if (!Schema::hasColumn('bookings', 'transaction_id')) {
                $table->string('transaction_id', 255)->nullable()->after('payment_method');
            }
            
            // Add cancelled_at column if it doesn't exist
            if (!Schema::hasColumn('bookings', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('refunded_at');
            }
            
            // Add indexes for better performance
            $table->index('booking_reference', 'idx_booking_reference');
            $table->index('transaction_id', 'idx_transaction_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            // Drop indexes first
            $table->dropIndex('idx_booking_reference');
            $table->dropIndex('idx_transaction_id');
            
            // Drop columns
            $table->dropColumn('booking_reference');
            $table->dropColumn('payment_method');
            $table->dropColumn('transaction_id');
            $table->dropColumn('cancelled_at');
        });
    }
};