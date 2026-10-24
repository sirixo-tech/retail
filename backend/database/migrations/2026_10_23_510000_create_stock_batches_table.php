<?php

use App\Support\Tenancy\RlsHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('stock_batches')) {
            Schema::create('stock_batches', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id');
                $table->uuid('store_item_id');
                $table->string('batch_number', 100);
                $table->date('manufacturing_date')->nullable();
                $table->date('expiry_date')->nullable();
                $table->uuid('supplier_id')->nullable();
                $table->uuid('purchase_id')->nullable();
                $table->decimal('qty_purchased', 14, 3)->default(0);
                $table->decimal('qty_remaining', 14, 3)->default(0);
                $table->bigInteger('cost_paise')->default(0);
                $table->string('status', 20)->default('active');
                $table->timestamps();

                $table->unique(['store_item_id', 'batch_number'], 'idx_batches_item_number');
                $table->index('expiry_date', 'idx_batches_expiry');
                $table->index('tenant_id', 'idx_batches_tenant');
            });

            RlsHelper::enableRls('stock_batches');
        }

        if (! Schema::hasTable('sale_line_batches')) {
            Schema::create('sale_line_batches', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('sale_line_id');
                $table->uuid('batch_id');
                $table->decimal('qty', 14, 3);
                $table->timestamps();

                $table->index('sale_line_id', 'idx_slb_line');
                $table->index('batch_id', 'idx_slb_batch');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_line_batches');
        RlsHelper::disableRls('stock_batches');
        Schema::dropIfExists('stock_batches');
    }
};
