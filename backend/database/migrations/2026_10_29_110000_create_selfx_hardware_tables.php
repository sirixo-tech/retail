<?php

use App\Support\Tenancy\RlsHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('selfx_hardware_products')) {
            Schema::create('selfx_hardware_products', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('sku', 64)->unique();
                $table->string('name', 160);
                $table->string('model', 80);
                $table->string('category', 40); // kiosk, pos_terminal, handheld_pos, printer, scanner, cash_drawer
                $table->string('headline', 200)->nullable();
                $table->text('description');
                $table->json('specs'); // display, cpu, ram, storage, os, connectivity, printer, dimensions, power
                $table->bigInteger('buy_price_paise')->default(0);
                $table->bigInteger('monthly_rent_paise')->default(0);
                $table->bigInteger('security_deposit_paise')->default(0);
                $table->integer('warranty_months')->default(12);
                $table->integer('stock_qty')->default(10);
                $table->integer('lead_time_days')->default(2);
                $table->json('images')->nullable();
                $table->string('datasheet_url', 300)->nullable();
                $table->string('badge', 60)->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index('category');
                $table->index('is_active');
            });
        }

        if (! Schema::hasTable('selfx_hardware_orders')) {
            Schema::create('selfx_hardware_orders', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('order_number', 40)->unique();
                $table->uuid('tenant_id');
                $table->uuid('hardware_product_id');
                $table->string('type', 24); // buy, rent, demo, replacement, return
                $table->string('status', 32)->default('pending_payment'); // pending_payment, confirmed, dispatched, delivered, active_rental, demo_scheduled, demo_completed, replacement_approved, device_shipped, return_inspected, cancelled
                $table->bigInteger('amount_paise')->default(0);
                $table->bigInteger('deposit_paise')->default(0);
                $table->uuid('delivery_store_id')->nullable();
                $table->json('shipping_address')->nullable();
                $table->json('demo_details')->nullable(); // date, time_slot, mode (in_store/virtual), contact_name, contact_phone, notes
                $table->json('rma_details')->nullable(); // original_order_id, serial_number, issue_category, issue_description, photo_urls, rma_number
                $table->json('courier_details')->nullable(); // carrier, tracking_number, tracking_url, dispatched_at, delivered_at
                $table->string('payment_reference', 100)->nullable();
                $table->string('payment_gateway', 40)->nullable();
                $table->timestamps();

                $table->index(['tenant_id', 'status']);
                $table->index('hardware_product_id');
            });

            RlsHelper::enableRls('selfx_hardware_orders');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('selfx_hardware_orders');
        Schema::dropIfExists('selfx_hardware_products');
    }
};
