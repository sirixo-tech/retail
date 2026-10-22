<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_counts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('store_id');
            $table->string('status')->default('posted');
            $table->timestamps();
        });

        Schema::create('stock_count_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('stock_count_id');
            $table->uuid('store_item_id');
            $table->decimal('counted_qty', 14, 3);
            $table->decimal('on_hand_qty', 14, 3);
            $table->decimal('delta_qty', 14, 3);
            $table->timestamps();
        });

        Schema::create('purchase_returns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('store_id');
            $table->uuid('supplier_id');
            $table->uuid('store_item_id');
            $table->decimal('qty', 14, 3);
            $table->bigInteger('cost_paise');
            $table->bigInteger('amount_paise');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_returns');
        Schema::dropIfExists('stock_count_lines');
        Schema::dropIfExists('stock_counts');
    }
};
