<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('futsals', function (Blueprint $table) {
            $table->decimal('average_rating', 2, 1)->default(0);
            $table->integer('total_reviews')->default(0);
            $table->json('rating_distribution')->nullable(); // Store counts for 1-5 stars
        });
    }

    public function down()
    {
        Schema::table('futsals', function (Blueprint $table) {
            $table->dropColumn(['average_rating', 'total_reviews', 'rating_distribution']);
        });
    }
};