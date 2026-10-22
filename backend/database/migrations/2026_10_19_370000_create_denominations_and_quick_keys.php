<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('denomination_counts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('shift_id');
            $table->unsignedInteger('value_paise');
            $table->unsignedInteger('count');
            $table->timestamp('created_at')->useCurrent();
            $table->index('shift_id');
        });

        Schema::create('pos_quick_keys', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('store_id');
            $table->uuid('store_item_id');
            $table->unsignedTinyInteger('position');
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['store_id', 'position']);
            $table->unique(['store_id', 'store_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_quick_keys');
        Schema::dropIfExists('denomination_counts');
    }
};
