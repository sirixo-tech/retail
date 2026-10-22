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
        Schema::table('orders', function (Blueprint $table) {
            $table->string('pickup_qr', 64)->nullable()->index();
            $table->string('delivery_staff_id', 36)->nullable()->index();
            $table->string('delivery_staff_name', 120)->nullable();
            $table->string('delivery_staff_phone', 30)->nullable();
            $table->string('delivery_status', 30)->default('unassigned')->index();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('live_location_url', 500)->nullable();
            $table->text('order_notes')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'pickup_qr',
                'delivery_staff_id',
                'delivery_staff_name',
                'delivery_staff_phone',
                'delivery_status',
                'latitude',
                'longitude',
                'live_location_url',
                'order_notes',
            ]);
        });
    }
};
