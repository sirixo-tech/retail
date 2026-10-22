<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->bigInteger('khata_balance_paise')->default(0);
        });

        Schema::table('store_items', function (Blueprint $table) {
            $table->decimal('reorder_point', 14, 3)->default(5);
        });

        Schema::create('customer_addresses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('customer_id');
            $table->string('line1');
            $table->string('city')->nullable();
            $table->string('pincode', 12)->nullable();
            $table->timestamps();
            $table->index('customer_id');
        });

        Schema::create('khata_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('customer_id');
            $table->string('direction');
            $table->bigInteger('amount_paise');
            $table->string('note')->nullable();
            $table->uuid('sale_id')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['customer_id', 'created_at']);
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->uuid('actor_id')->nullable();
            $table->string('action');
            $table->uuid('subject_id')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['tenant_id', 'created_at']);
        });

        Schema::create('pos_holds', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('store_id');
            $table->uuid('user_id');
            $table->string('label')->nullable();
            $table->json('lines');
            $table->timestamps();
            $table->index(['store_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_holds');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('khata_entries');
        Schema::dropIfExists('customer_addresses');
        Schema::table('store_items', function (Blueprint $table) {
            $table->dropColumn('reorder_point');
        });
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('khata_balance_paise');
        });
    }
};
