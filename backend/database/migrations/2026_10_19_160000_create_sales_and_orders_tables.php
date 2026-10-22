<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shifts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('store_id');
            $table->uuid('counter_id');
            $table->uuid('user_id');
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->bigInteger('opening_cash_paise')->default(0);
            $table->bigInteger('expected_cash_paise')->nullable();
            $table->bigInteger('actual_cash_paise')->nullable();
            $table->string('status')->default('open');
            $table->timestamps();
            $table->index(['store_id', 'status']);
        });

        Schema::create('sales', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('store_id');
            $table->uuid('counter_id');
            $table->uuid('shift_id');
            $table->uuid('order_id')->nullable();
            $table->string('number');
            $table->uuid('client_uuid');
            $table->string('status')->default('completed');
            $table->string('gst_pricing_mode');
            $table->bigInteger('subtotal_paise');
            $table->bigInteger('discount_paise')->default(0);
            $table->bigInteger('cgst_paise')->default(0);
            $table->bigInteger('sgst_paise')->default(0);
            $table->bigInteger('igst_paise')->default(0);
            $table->bigInteger('cess_paise')->default(0);
            $table->bigInteger('round_off_paise')->default(0);
            $table->bigInteger('total_paise');
            $table->timestamps();
            $table->unique(['tenant_id', 'client_uuid']);
            $table->unique(['tenant_id', 'number']);
        });

        Schema::create('sale_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('sale_id');
            $table->uuid('store_item_id');
            $table->string('description_snapshot');
            $table->string('hsn_snapshot', 8)->nullable();
            $table->decimal('qty', 14, 3);
            $table->bigInteger('unit_price_paise');
            $table->bigInteger('discount_paise')->default(0);
            $table->bigInteger('taxable_paise');
            $table->unsignedInteger('gst_bps')->default(0);
            $table->unsignedInteger('cess_bps')->default(0);
            $table->bigInteger('cgst_paise')->default(0);
            $table->bigInteger('sgst_paise')->default(0);
            $table->bigInteger('igst_paise')->default(0);
            $table->bigInteger('cess_paise')->default(0);
            $table->bigInteger('line_total_paise');
            $table->timestamps();
            $table->index('sale_id');
        });

        Schema::create('sale_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('sale_id');
            $table->string('method');
            $table->bigInteger('amount_paise');
            $table->bigInteger('change_paise')->default(0);
            $table->string('reference')->nullable();
            $table->timestamps();
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('store_id');
            $table->string('number');
            $table->string('status')->default('placed');
            $table->string('fulfillment');
            $table->string('customer_name');
            $table->string('customer_phone');
            $table->json('address_snapshot')->nullable();
            $table->bigInteger('subtotal_paise');
            $table->bigInteger('delivery_fee_paise')->default(0);
            $table->bigInteger('total_paise');
            $table->string('payment_status')->default('unpaid');
            $table->uuid('sale_id')->nullable();
            $table->timestamps();
            $table->unique(['tenant_id', 'number']);
            $table->index(['store_id', 'status']);
        });

        Schema::create('order_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->uuid('store_item_id');
            $table->string('name_snapshot');
            $table->decimal('qty', 14, 3);
            $table->bigInteger('unit_price_paise');
            $table->timestamps();
        });

        Schema::create('order_status_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->string('from_status')->nullable();
            $table->string('to_status');
            $table->uuid('actor_id')->nullable();
            $table->string('note')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['order_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_status_events');
        Schema::dropIfExists('order_lines');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('sale_payments');
        Schema::dropIfExists('sale_lines');
        Schema::dropIfExists('sales');
        Schema::dropIfExists('shifts');
    }
};
