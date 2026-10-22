<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('price_lists', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name');
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            $table->index(['tenant_id', 'is_default']);
        });

        Schema::create('store_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('store_id');
            $table->uuid('master_product_id')->nullable();
            $table->string('sku');
            $table->string('name_override')->nullable();
            $table->boolean('online_visible')->default(false);
            $table->boolean('track_stock')->default(true);
            $table->string('status')->default('active');
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['store_id', 'sku']);
            $table->index(['store_id', 'master_product_id']);
        });

        Schema::create('store_item_prices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('store_item_id');
            $table->uuid('price_list_id');
            $table->bigInteger('mrp_paise');
            $table->bigInteger('selling_price_paise');
            $table->timestamp('starts_at');
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();
            $table->index(['store_item_id', 'starts_at']);
        });

        Schema::create('store_item_barcodes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('store_item_id');
            $table->uuid('tenant_id');
            $table->string('value_normalised');
            $table->string('type');
            $table->timestamps();
            $table->unique(['tenant_id', 'value_normalised']);
        });

        Schema::create('stock_balances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('store_item_id');
            $table->uuid('store_id');
            $table->decimal('on_hand', 14, 3)->default(0);
            $table->decimal('reserved', 14, 3)->default(0);
            $table->timestamps();
            $table->unique(['store_item_id', 'store_id']);
        });

        Schema::create('stock_ledger_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('store_id');
            $table->uuid('store_item_id');
            $table->decimal('qty_delta', 14, 3);
            $table->bigInteger('unit_cost_paise')->nullable();
            $table->string('reason');
            $table->string('reference_type')->nullable();
            $table->uuid('reference_id')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['store_item_id', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_ledger_entries');
        Schema::dropIfExists('stock_balances');
        Schema::dropIfExists('store_item_barcodes');
        Schema::dropIfExists('store_item_prices');
        Schema::dropIfExists('store_items');
        Schema::dropIfExists('price_lists');
    }
};
