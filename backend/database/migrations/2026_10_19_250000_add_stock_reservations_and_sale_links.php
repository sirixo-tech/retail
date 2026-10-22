<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('stock_balances', 'reserved')) {
            Schema::table('stock_balances', function (Blueprint $table) {
                $table->decimal('reserved', 14, 3)->default(0);
            });
        }

        Schema::create('stock_reservations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('store_id');
            $table->uuid('store_item_id');
            $table->uuid('order_id');
            $table->decimal('qty', 14, 3);
            $table->string('status')->default('reserved');
            $table->timestamp('reserved_at');
            $table->timestamps();
            $table->index(['order_id', 'status']);
            $table->index(['status', 'reserved_at']);
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->unique('order_id');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->uuid('shift_id')->nullable()->change();
        });

        Schema::table('sale_lines', function (Blueprint $table) {
            $table->uuid('store_item_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('sale_lines', function (Blueprint $table) {
            $table->uuid('store_item_id')->nullable(false)->change();
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->uuid('shift_id')->nullable(false)->change();
            $table->dropUnique(['order_id']);
        });

        Schema::dropIfExists('stock_reservations');
    }
};
