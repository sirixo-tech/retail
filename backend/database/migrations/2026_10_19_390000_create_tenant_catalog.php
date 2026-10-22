<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('parent_id')->nullable();
            $table->string('code');
            $table->string('name');
            $table->boolean('online_visible')->default(true);
            $table->timestamps();
            $table->unique(['tenant_id', 'code']);
        });

        Schema::create('tenant_brands', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name');
            $table->string('description')->nullable();
            $table->timestamps();
            $table->unique(['tenant_id', 'name']);
        });

        Schema::create('tenant_units', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name');
            $table->string('short_name', 16);
            $table->uuid('base_unit_id')->nullable();
            $table->string('operator')->default('*');
            $table->decimal('operation_value', 14, 3)->default(1);
            $table->timestamps();
            $table->unique(['tenant_id', 'short_name']);
        });

        Schema::table('store_items', function (Blueprint $table) {
            $table->uuid('category_id')->nullable();
            $table->uuid('brand_id')->nullable();
            $table->uuid('unit_id')->nullable();
            $table->bigInteger('cost_paise')->default(0);
            $table->unsignedInteger('gst_bps')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('store_items', function (Blueprint $table) {
            $table->dropColumn(['category_id', 'brand_id', 'unit_id', 'cost_paise', 'gst_bps']);
        });
        Schema::dropIfExists('tenant_units');
        Schema::dropIfExists('tenant_brands');
        Schema::dropIfExists('tenant_categories');
    }
};
