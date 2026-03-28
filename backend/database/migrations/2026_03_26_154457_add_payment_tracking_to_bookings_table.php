<?php
// database/migrations/2024_03_26_000000_add_payment_tracking_to_bookings_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            // Track refund status (none, pending, completed, failed)
            if (!Schema::hasColumn('bookings', 'refund_status')) {
                $table->string('refund_status')->default('none')->after('payment_attempts');
            }
            
            // Amount refunded
            if (!Schema::hasColumn('bookings', 'refund_amount')) {
                $table->decimal('refund_amount', 10, 2)->default(0)->after('refund_status');
            }
            
            // When refund was processed
            if (!Schema::hasColumn('bookings', 'refunded_at')) {
                $table->timestamp('refunded_at')->nullable()->after('refund_amount');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'payment_expires_at',
                'payment_attempts',
                'refund_status',
                'refund_amount',
                'refunded_at'
            ]);
        });
    }
};