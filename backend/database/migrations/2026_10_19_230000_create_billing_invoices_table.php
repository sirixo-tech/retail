<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('billing_invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('subscription_id');
            $table->string('number');
            $table->string('status')->default('open');
            $table->bigInteger('subtotal_paise');
            $table->bigInteger('cgst_paise')->default(0);
            $table->bigInteger('sgst_paise')->default(0);
            $table->bigInteger('total_paise');
            $table->timestamp('period_start');
            $table->timestamp('period_end');
            $table->boolean('specimen')->default(true);
            $table->timestamps();
            $table->unique(['subscription_id', 'period_start']);
            $table->unique('number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('billing_invoices');
    }
};
