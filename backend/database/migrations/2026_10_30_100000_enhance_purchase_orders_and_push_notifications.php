<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Enhance purchase_orders with financial and operational columns
        Schema::table('purchase_orders', function (Blueprint $table) {
            if (! Schema::hasColumn('purchase_orders', 'order_tax_rate')) {
                $table->decimal('order_tax_rate', 5, 2)->default(0)->after('status');
                $table->bigInteger('order_tax_paise')->default(0)->after('order_tax_rate');
                $table->bigInteger('discount_paise')->default(0)->after('order_tax_paise');
                $table->bigInteger('shipping_paise')->default(0)->after('discount_paise');
                $table->bigInteger('total_paise')->default(0)->after('shipping_paise');
                $table->bigInteger('paid_paise')->default(0)->after('total_paise');
                $table->bigInteger('due_paise')->default(0)->after('paid_paise');
                $table->string('payment_status')->default('paid')->after('due_paise');
                $table->text('notes')->nullable()->after('payment_status');
            }
        });

        // 2. Enhance purchase_order_lines with discounts, taxes, and batch tracking
        Schema::table('purchase_order_lines', function (Blueprint $table) {
            if (! Schema::hasColumn('purchase_order_lines', 'discount_paise')) {
                $table->bigInteger('discount_paise')->default(0)->after('cost_paise');
                $table->unsignedInteger('tax_bps')->default(0)->after('discount_paise');
                $table->bigInteger('subtotal_paise')->default(0)->after('tax_bps');
                $table->string('batch_number')->nullable()->after('subtotal_paise');
                $table->date('expires_on')->nullable()->after('batch_number');
            }
        });

        // 3. Create platform push notification configuration table
        if (! Schema::hasTable('platform_push_settings')) {
            Schema::create('platform_push_settings', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('web_api_key')->nullable();
                $table->string('auth_domain')->nullable();
                $table->string('project_id')->nullable();
                $table->string('app_id')->nullable();
                $table->string('messaging_sender_id')->nullable();

                // Mobile Apps
                $table->string('pos_android_app_id')->nullable();
                $table->string('pos_ios_app_id')->nullable();
                $table->string('kiosk_android_app_id')->nullable();
                $table->string('kiosk_ios_app_id')->nullable();
                $table->string('customer_android_app_id')->nullable();
                $table->string('customer_ios_app_id')->nullable();

                // Cloud Messaging
                $table->text('vapid_key')->nullable();
                $table->text('service_account_json')->nullable();
                $table->string('status')->default('ready');
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_push_settings');

        Schema::table('purchase_order_lines', function (Blueprint $table) {
            $table->dropColumn(['discount_paise', 'tax_bps', 'subtotal_paise', 'batch_number', 'expires_on']);
        });

        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropColumn([
                'order_tax_rate',
                'order_tax_paise',
                'discount_paise',
                'shipping_paise',
                'total_paise',
                'paid_paise',
                'due_paise',
                'payment_status',
                'notes',
            ]);
        });
    }
};
