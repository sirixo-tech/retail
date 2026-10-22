<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('legal_name')->nullable();
            $table->string('gstin', 15)->nullable();
            $table->string('sac', 6)->nullable();
            $table->string('address')->nullable();
            $table->timestamps();
        });

        Schema::create('coupons', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('code');
            $table->string('kind');
            $table->unsignedInteger('value');
            $table->string('status')->default('active');
            $table->unsignedInteger('max_redemptions')->nullable();
            $table->unsignedInteger('redeemed_count')->default(0);
            $table->date('expires_at')->nullable();
            $table->timestamps();
            $table->unique(['tenant_id', 'code']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->bigInteger('discount_paise')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('discount_paise');
        });
        Schema::dropIfExists('coupons');
        Schema::dropIfExists('platform_settings');
    }
};
