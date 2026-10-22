<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_zones', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('store_id');
            $table->uuid('tenant_id');
            $table->string('pincode', 12);
            $table->bigInteger('charge_paise')->default(0);
            $table->timestamps();
            $table->unique(['store_id', 'pincode']);
        });

        Schema::create('deliveries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('order_id')->unique();
            $table->string('otp_hash');
            $table->unsignedTinyInteger('otp_attempts')->default(0);
            $table->string('status')->default('assigned');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deliveries');
        Schema::dropIfExists('delivery_zones');
    }
};
