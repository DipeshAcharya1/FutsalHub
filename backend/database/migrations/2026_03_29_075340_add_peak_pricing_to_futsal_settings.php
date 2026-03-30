<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddPeakPricingToFutsalSettings extends Migration
{
    public function up()
    {
        Schema::table('futsal_settings', function (Blueprint $table) {
            // Peak hours configuration
            $table->time('peak_morning_start')->nullable()->after('default_price');
            $table->time('peak_morning_end')->nullable()->after('peak_morning_start');
            $table->time('peak_evening_start')->nullable()->after('peak_morning_end');
            $table->time('peak_evening_end')->nullable()->after('peak_evening_start');
            
            // Pricing multipliers
            $table->decimal('peak_price_multiplier', 3, 2)->default(1.30)->after('peak_evening_end');
            $table->decimal('off_peak_price_multiplier', 3, 2)->default(1.00)->after('peak_price_multiplier');
        });
        
        Schema::table('futsal_slots', function (Blueprint $table) {
            $table->enum('price_type', ['peak', 'off_peak', 'custom'])->default('off_peak')->after('price');
            $table->decimal('original_price', 10, 2)->nullable()->after('price_type');
        });
    }

    public function down()
    {
        Schema::table('futsal_settings', function (Blueprint $table) {
            $table->dropColumn([
                'peak_morning_start',
                'peak_morning_end',
                'peak_evening_start',
                'peak_evening_end',
                'peak_price_multiplier',
                'off_peak_price_multiplier'
            ]);
        });
        
        Schema::table('futsal_slots', function (Blueprint $table) {
            $table->dropColumn(['price_type', 'original_price']);
        });
    }
}