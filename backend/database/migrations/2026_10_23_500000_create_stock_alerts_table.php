<?php

use App\Support\Tenancy\RlsHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('stock_alerts')) {
            Schema::create('stock_alerts', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id');
                $table->uuid('store_id')->nullable();
                $table->string('alert_type', 50)->default('low_stock');
                $table->integer('item_count')->default(0);
                $table->json('items')->nullable();
                $table->timestamp('acknowledged_at')->nullable();
                $table->uuid('acknowledged_by')->nullable();
                $table->timestamps();

                $table->index(['tenant_id', 'created_at'], 'idx_stock_alerts_tenant');
            });

            RlsHelper::enableRls('stock_alerts');
        }
    }

    public function down(): void
    {
        RlsHelper::disableRls('stock_alerts');
        Schema::dropIfExists('stock_alerts');
    }
};
