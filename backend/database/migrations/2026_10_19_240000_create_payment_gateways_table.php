<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_gateways', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('store_id');
            $table->string('provider');
            $table->string('mode')->default('test');
            $table->text('credentials_ciphertext')->nullable();
            $table->string('status')->default('active');
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            $table->unique(['store_id', 'provider', 'mode']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('payment_method')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('payment_method');
        });
        Schema::dropIfExists('payment_gateways');
    }
};
